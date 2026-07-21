import { afterEach, beforeEach, expect, test } from "bun:test";
import type { AuthProvider } from "@damatjs/auth";
import type { PaymentProvider } from "@damatjs/payment";
import type { SubscriptionProvider } from "@damatjs/subscription";
import { Hono } from "@damatjs/deps/hono";
import { clearModules, clearProviders, getProvider } from "@damatjs/framework";
import { initializeServices } from "@damatjs/framework/services";
import type { ServiceInstances } from "@damatjs/framework/services";
import { PoolManager } from "@damatjs/services";

beforeEach(() => {
  PoolManager.setup({
    pool: {} as never,
    logger: {} as never,
    connectionManager: {} as never,
  });
});

afterEach(() => {
  clearProviders();
  clearModules();
  PoolManager.reset();
});

test("backend startup initializes and binds every provider module", async () => {
  const services = await startProviderBackend();

  const auth = getProvider<AuthProvider>("auth")!;
  const payment = getProvider<PaymentProvider>("payment")!;
  const subscription = getProvider<SubscriptionProvider>("subscription")!;
  expect(services.providers?.get("auth")).toBe(auth);
  expect(services.providers?.get("payment")).toBe(payment);
  expect(services.providers?.get("subscription")).toBe(subscription);
  expect(services.authRuntime?.provider).toBe(auth);
  expect((await auth.getPrincipal("backend-user"))?.id).toBe("backend-user");
  expect((await payment.listPayments({})).data).toHaveLength(1);
  expect((await subscription.listSubscriptions({})).data).toHaveLength(1);
});

test("backend auth handlers protect requests with the bound auth module", async () => {
  const services = await startProviderBackend();
  const app = new Hono();
  app.get("/public", (context) => context.text("public"));
  app.use("/session", services.authRuntime!.handlers.session!);
  app.get("/session", (context) => context.json({ id: context.get("userId") }));
  app.use("/api-key", services.authRuntime!.handlers.apiKey!);
  app.get("/api-key", (context) => context.json({ id: context.get("userId") }));

  expect((await app.request("/public")).status).toBe(200);
  expect((await app.request("/session")).status).toBe(401);
  const session = await app.request("/session", {
    headers: { authorization: "Bearer backend-session" },
  });
  expect(await session.json()).toEqual({ id: "backend-user" });
  const apiKey = await app.request("/api-key", {
    headers: { "x-api-key": "backend-secret" },
  });
  expect(await apiKey.json()).toEqual({ id: "backend-user" });
});

function startProviderBackend(): Promise<ServiceInstances> {
  return initializeServices(
    {
      projectConfig: { http: { host: "localhost", port: 0 } },
      modules: {
        auth: { resolve: "./tests/providers/auth.ts" },
        payment: { resolve: "./tests/providers/payment.ts" },
        subscription: { resolve: "./tests/providers/subscription.ts" },
      },
      providers: {
        auth: { module: "auth" },
        payment: { module: "payment" },
        subscription: { module: "subscription" },
      },
    },
    import.meta.dir.replace(/\/tests$/, ""),
  );
}
