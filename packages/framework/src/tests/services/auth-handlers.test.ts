import { expect, test } from "bun:test";
import { Hono } from "@damatjs/deps/hono";
import { createProviderAuthHandlers } from "../../services/authHandlers";

const logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
} as never;

function appWith(handler: "session" | "apiKey" | "flexible", provider: any) {
  const app = new Hono();
  app.use("*", createProviderAuthHandlers(provider, logger)[handler]!);
  app.get("/", (context) =>
    context.json({
      user: context.get("user"),
      userId: context.get("userId"),
      team: context.get("team"),
    }),
  );
  return app;
}

test("session and API-key handlers dispatch known provider methods", async () => {
  const calls: string[] = [];
  const provider = {
    authenticate: async () => {
      calls.push("session");
      return { id: "user", orgId: "org" };
    },
    verifyApiKey: async () => {
      calls.push("apiKey");
      return { id: "machine", keyId: "key", scopes: ["read"] };
    },
  };
  const session = await appWith("session", provider).request("/");
  expect(await session.json()).toEqual({
    user: { id: "user", orgId: "org" },
    userId: "user",
    team: { id: "org" },
  });
  const apiKey = await appWith("apiKey", provider).request("/");
  expect((await apiKey.json()).user.keyId).toBe("key");
  expect(calls).toEqual(["session", "apiKey"]);
});

test("flexible authentication tries session before API key", async () => {
  const calls: string[] = [];
  const provider = {
    authenticate: async () => {
      calls.push("session");
      return null;
    },
    verifyApiKey: async () => {
      calls.push("apiKey");
      return { id: "machine", keyId: "key", scopes: [] };
    },
  };
  const response = await appWith("flexible", provider).request("/");
  expect(response.status).toBe(200);
  expect(calls).toEqual(["session", "apiKey"]);
});
