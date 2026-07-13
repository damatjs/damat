import { describe, it, expect, mock, beforeEach } from "bun:test";

// Mock the Better Auth SDK: betterAuth(options) returns a fake instance whose
// getSession/handler we control, and we capture the options passed to it.
const state = {
  builtWith: null as unknown,
  session: null as { user: { id: string; [k: string]: unknown } } | null,
  handlerResponse: new Response("ok", { status: 200 }),
  handlerReq: null as Request | null,
};

mock.module("better-auth", () => ({
  betterAuth: (options: unknown) => {
    state.builtWith = options;
    return {
      handler: async (req: Request) => {
        state.handlerReq = req;
        return state.handlerResponse;
      },
      api: {
        getSession: async () => state.session,
      },
    };
  },
}));

import { createBetterAuthProvider } from "../src/index";
import { Hono } from "@damatjs/deps/hono";

const savedSecret = process.env.BETTER_AUTH_SECRET;

beforeEach(() => {
  state.builtWith = null;
  state.session = null;
  state.handlerReq = null;
  state.handlerResponse = new Response("ok", { status: 200 });
  process.env.BETTER_AUTH_SECRET = "test-secret-32-characters-long!!";
});

/** authenticate only reads `c.req.raw.headers`, so a minimal stub suffices. */
function ctxFor(headers: Record<string, string> = {}) {
  return {
    req: { raw: new Request("http://localhost/", { headers }) },
  } as unknown as import("@damatjs/deps/hono").Context;
}

describe("createBetterAuthProvider — build", () => {
  it("names itself and mounts routes at the default basePath", () => {
    const provider = createBetterAuthProvider();
    expect(provider.name).toBe("better-auth");
    expect(provider.routes?.basePath).toBe("/api/auth");
  });

  it("honors a custom basePath", () => {
    const provider = createBetterAuthProvider({ basePath: "/auth" });
    expect(provider.routes?.basePath).toBe("/auth");
  });

  it("passes secret, database, and table model overrides to betterAuth", () => {
    createBetterAuthProvider({
      secret: "explicit-secret",
      database: { fake: "pool" },
      tables: { user: "auth_users", session: "auth_sessions" },
    });
    const opts = state.builtWith as Record<string, unknown>;
    expect(opts.secret).toBe("explicit-secret");
    expect(opts.database).toEqual({ fake: "pool" });
    expect(opts.user).toEqual({ modelName: "auth_users" });
    expect(opts.session).toEqual({ modelName: "auth_sessions" });
    expect(opts.account).toBeUndefined();
  });

  it("falls back to BETTER_AUTH_SECRET from the environment", () => {
    createBetterAuthProvider();
    expect((state.builtWith as { secret: string }).secret).toBe(
      "test-secret-32-characters-long!!",
    );
  });

  it("throws a clear error when no secret is available", () => {
    delete process.env.BETTER_AUTH_SECRET;
    expect(() => createBetterAuthProvider()).toThrow(/requires a secret/);
    if (savedSecret !== undefined) process.env.BETTER_AUTH_SECRET = savedSecret;
  });

  it("uses a pre-built auth instance verbatim (no betterAuth() call)", () => {
    state.builtWith = "SENTINEL";
    const provider = createBetterAuthProvider({
      auth: {
        handler: async () => new Response("x"),
        api: { getSession: async () => null },
      },
    });
    expect(provider.name).toBe("better-auth");
    expect(state.builtWith).toBe("SENTINEL"); // betterAuth() was never called
  });
});

describe("createBetterAuthProvider — authenticate", () => {
  it("maps a Better Auth session user to the principal (email split out, extras kept)", async () => {
    state.session = {
      user: { id: "u1", email: "a@b.co", name: "Ada", role: "admin" },
    };
    const provider = createBetterAuthProvider();
    const principal = await provider.authenticate(ctxFor());
    expect(principal).toEqual({
      id: "u1",
      email: "a@b.co",
      name: "Ada",
      role: "admin",
    });
  });

  it("returns null when there is no session", async () => {
    state.session = null;
    const provider = createBetterAuthProvider();
    expect(await provider.authenticate(ctxFor())).toBeNull();
  });

  it("omits email when the session user has none", async () => {
    state.session = { user: { id: "u2" } };
    const provider = createBetterAuthProvider();
    expect(await provider.authenticate(ctxFor())).toEqual({ id: "u2" });
  });
});

describe("createBetterAuthProvider — routes", () => {
  it("forwards the raw request to Better Auth's handler and returns its response", async () => {
    state.handlerResponse = new Response(JSON.stringify({ ok: true }), {
      status: 201,
    });
    const provider = createBetterAuthProvider();
    const app = new Hono();
    app.all("/api/auth/*", provider.routes!.handler);
    const res = await app.request("/api/auth/sign-in", { method: "POST" });
    expect(res.status).toBe(201);
    expect(state.handlerReq?.method).toBe("POST");
  });
});
