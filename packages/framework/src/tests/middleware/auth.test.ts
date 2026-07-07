import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { Hono } from "@damatjs/deps/hono";
import { createAuthMiddleware } from "../../middleware/auth";
import { clearGlobalLogger } from "../../services/logger";

// The auth middleware calls getLogger(); reset the logger singleton so the
// suite is order-independent. getLogger() lazily re-initializes when needed.
beforeEach(() => clearGlobalLogger());
afterEach(() => clearGlobalLogger());

describe("createAuthMiddleware", () => {
  it("passes through immediately for type 'none' without invoking custom handlers", async () => {
    const app = new Hono();
    const custom = mock(async (_c: unknown, next: () => Promise<void>) => next());
    app.use("*", createAuthMiddleware("none", { session: custom as never }));
    app.get("/", (c) => c.text("ok"));

    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
    expect(custom).not.toHaveBeenCalled();
  });

  it("delegates to the matching custom middleware for the requested auth type", async () => {
    const app = new Hono();
    const sessionMw = mock(async (c: any, _next: () => Promise<void>) =>
      c.json({ via: "session" }, 201),
    );
    app.use("*", createAuthMiddleware("session", { session: sessionMw as never }));
    app.get("/", (c) => c.text("handler"));

    const res = await app.request("/");
    expect(res.status).toBe(201);
    expect((await res.json()).via).toBe("session");
    expect(sessionMw).toHaveBeenCalledTimes(1);
  });

  it("selects the custom middleware keyed by the auth type (apiKey)", async () => {
    const app = new Hono();
    const apiKeyMw = mock(async (_c: unknown, next: () => Promise<void>) => next());
    const sessionMw = mock(async (_c: unknown, next: () => Promise<void>) => next());
    app.use(
      "*",
      createAuthMiddleware("apiKey", {
        apiKey: apiKeyMw as never,
        session: sessionMw as never,
      }),
    );
    app.get("/", (c) => c.text("ok"));

    await app.request("/");
    expect(apiKeyMw).toHaveBeenCalledTimes(1);
    expect(sessionMw).not.toHaveBeenCalled();
  });

  it("rejects with 401 when the auth type has no configured custom middleware", async () => {
    const app = new Hono();
    const handler = mock((c: any) => c.text("reached"));
    app.use("*", createAuthMiddleware("flexible"));
    app.get("/", handler);

    const res = await app.request("/");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
    // Envelope carries the same meta block handleError adds; no requestId set
    // upstream here, so it falls back to "unknown".
    expect(body.meta.requestId).toBe("unknown");
    expect(typeof body.meta.timestamp).toBe("string");
    expect(handler).not.toHaveBeenCalled();
  });

  it("includes the upstream requestId in the 401 envelope meta when one is set", async () => {
    const app = new Hono();
    app.use("*", async (c, next) => {
      c.set("requestId", "req-abc");
      await next();
    });
    app.use("*", createAuthMiddleware("session"));
    app.get("/", (c) => c.text("reached"));

    const res = await app.request("/");
    expect(res.status).toBe(401);
    expect((await res.json()).meta.requestId).toBe("req-abc");
  });

  it("rejects with 401 for every non-none type without a handler", async () => {
    for (const type of ["session", "apiKey", "flexible"] as const) {
      const app = new Hono();
      app.use("*", createAuthMiddleware(type));
      app.get("/", (c) => c.text("reached"));

      const res = await app.request("/");
      expect(res.status).toBe(401);
    }
  });
});
