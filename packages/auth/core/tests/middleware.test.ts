import { describe, it, expect, beforeEach } from "bun:test";
import { Hono } from "@damatjs/deps/hono";
import { setGlobalLogger, type ILogger } from "@damatjs/logger";
import { createAuthHandlers, setPrincipal } from "../src/index";
import type { AuthPrincipal, AuthProvider } from "../src/index";

const logs: Array<{ level: string; msg: string }> = [];
const recordingLogger = {
  debug: () => {},
  info: () => {},
  warn: (msg: string) => logs.push({ level: "warn", msg }),
  error: (msg: string) => logs.push({ level: "error", msg }),
  fatal: () => {},
  waiting: () => {},
  progress: () => {},
  cached: () => {},
  success: () => {},
  skip: () => {},
  child: () => recordingLogger,
  withPrefix: () => recordingLogger,
  request: () => {},
  close: () => {},
} as unknown as ILogger;

beforeEach(() => {
  logs.length = 0;
  setGlobalLogger(recordingLogger as never);
});

/** A provider stub whose behavior each test sets. */
function fakeProvider(overrides: Partial<AuthProvider> = {}): AuthProvider {
  return {
    name: "fake",
    authenticate: async () => null,
    ...overrides,
  };
}

/** Mount one handler + a terminal echo of the principal the middleware set. */
function appWith(handler: ReturnType<typeof createAuthHandlers>["session"]) {
  const app = new Hono();
  app.use("*", handler);
  app.get("/", (c) =>
    c.json({ user: c.get("user" as never), team: c.get("team" as never) }),
  );
  return app;
}

describe("createAuthHandlers — session", () => {
  it("sets user/userId/team and continues on a verified request", async () => {
    const principal: AuthPrincipal = {
      id: "u1",
      email: "a@b.co",
      orgId: "org1",
    };
    const { session } = createAuthHandlers(
      fakeProvider({ authenticate: async () => principal }),
    );
    const res = await appWith(session).request("/");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      user: AuthPrincipal;
      team: { id: string };
    };
    expect(body.user).toEqual(principal);
    expect(body.team).toEqual({ id: "org1" });
  });

  it("omits team when the principal has no orgId", async () => {
    const { session } = createAuthHandlers(
      fakeProvider({ authenticate: async () => ({ id: "u1" }) }),
    );
    const body = (await (await appWith(session).request("/")).json()) as {
      team?: unknown;
    };
    expect(body.team).toBeUndefined();
  });

  it("returns the 401 envelope when unauthenticated", async () => {
    const { session } = createAuthHandlers(
      fakeProvider({ authenticate: async () => null }),
    );
    const res = await appWith(session).request("/");
    expect(res.status).toBe(401);
    const body = (await res.json()) as {
      success: boolean;
      error: { code: string };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("treats a thrown verification error as unauthenticated (401 + warn, never 500)", async () => {
    const { session } = createAuthHandlers(
      fakeProvider({
        name: "boom",
        authenticate: async () => {
          throw new Error("token expired");
        },
      }),
    );
    const res = await appWith(session).request("/");
    expect(res.status).toBe(401);
    expect(
      logs.some(
        (l) =>
          l.level === "warn" && l.msg.includes('"boom" verification failed'),
      ),
    ).toBe(true);
  });
});

describe("createAuthHandlers — onAuthenticated hook", () => {
  it("fires once with the principal on success", async () => {
    const seen: AuthPrincipal[] = [];
    const { session } = createAuthHandlers(
      fakeProvider({ authenticate: async () => ({ id: "u1" }) }),
      { onAuthenticated: (p) => void seen.push(p) },
    );
    await appWith(session).request("/");
    expect(seen).toEqual([{ id: "u1" }]);
  });

  it("does not fire when unauthenticated", async () => {
    let fired = false;
    const { session } = createAuthHandlers(
      fakeProvider({ authenticate: async () => null }),
      {
        onAuthenticated: () => void (fired = true),
      },
    );
    await appWith(session).request("/");
    expect(fired).toBe(false);
  });

  it("a throwing hook is logged but the request stays authenticated", async () => {
    const { session } = createAuthHandlers(
      fakeProvider({ authenticate: async () => ({ id: "u1" }) }),
      {
        onAuthenticated: () => {
          throw new Error("sync db down");
        },
      },
    );
    const res = await appWith(session).request("/");
    expect(res.status).toBe(200);
    expect(
      logs.some(
        (l) => l.level === "error" && l.msg.includes("onAuthenticated"),
      ),
    ).toBe(true);
  });
});

describe("createAuthHandlers — apiKey & flexible", () => {
  it("apiKey uses authenticateApiKey when provided", async () => {
    const provider = fakeProvider({
      authenticate: async () => null,
      authenticateApiKey: async () => ({ id: "key-user" }),
    });
    const { apiKey } = createAuthHandlers(provider);
    const body = (await (await appWith(apiKey).request("/")).json()) as {
      user: AuthPrincipal;
    };
    expect(body.user).toEqual({ id: "key-user" });
  });

  it("apiKey falls back to authenticate when the provider has no apiKey path", async () => {
    const provider = fakeProvider({
      authenticate: async () => ({ id: "sess" }),
    });
    const { apiKey } = createAuthHandlers(provider);
    const body = (await (await appWith(apiKey).request("/")).json()) as {
      user: AuthPrincipal;
    };
    expect(body.user).toEqual({ id: "sess" });
  });

  it("flexible tries session first, then apiKey", async () => {
    // session path misses, apiKey path hits
    const provider = fakeProvider({
      authenticate: async () => null,
      authenticateApiKey: async () => ({ id: "via-key" }),
    });
    const { flexible } = createAuthHandlers(provider);
    const body = (await (await appWith(flexible).request("/")).json()) as {
      user: AuthPrincipal;
    };
    expect(body.user).toEqual({ id: "via-key" });
  });

  it("flexible returns the session principal when it hits", async () => {
    const provider = fakeProvider({
      authenticate: async () => ({ id: "via-session" }),
      authenticateApiKey: async () => ({ id: "via-key" }),
    });
    const { flexible } = createAuthHandlers(provider);
    const body = (await (await appWith(flexible).request("/")).json()) as {
      user: AuthPrincipal;
    };
    expect(body.user).toEqual({ id: "via-session" });
  });

  it("flexible with no apiKey path 401s when the session misses", async () => {
    const provider = fakeProvider({ authenticate: async () => null });
    const { flexible } = createAuthHandlers(provider);
    expect((await appWith(flexible).request("/")).status).toBe(401);
  });
});

describe("setPrincipal", () => {
  it("sets user/userId and team-from-orgId directly on a context", async () => {
    const app = new Hono();
    app.get("/", (c) => {
      setPrincipal(c, { id: "u9", orgId: "o9" });
      return c.json({
        user: c.get("user" as never),
        userId: c.get("userId" as never),
        team: c.get("team" as never),
      });
    });
    const body = (await (await app.request("/")).json()) as {
      user: AuthPrincipal;
      userId: string;
      team: { id: string };
    };
    expect(body.userId).toBe("u9");
    expect(body.team).toEqual({ id: "o9" });
  });
});
