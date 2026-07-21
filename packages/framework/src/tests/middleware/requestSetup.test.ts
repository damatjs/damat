import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Hono } from "@damatjs/deps/hono";
import {
  setGlobalLoggerInstance,
  clearGlobalLogger,
} from "../../services/logger";
import { requestSetup } from "../../middleware/requestSetup";

// ---------------------------------------------------------------------------
// requestSetup calls getLogger() (the global logger singleton). We install a
// recording logger via the real setGlobalLoggerInstance API (no mock.module,
// which would be process-global and leak into other test files) and restore it
// after each test. The recording logger captures child contexts, debug calls,
// and request() summaries so we can assert middleware behavior.
// ---------------------------------------------------------------------------

const recorded = {
  childContexts: [] as any[],
  debugCalls: [] as { msg: string; meta: any }[],
  requestCalls: [] as any[],
};

function makeChildLogger(): any {
  return {
    debug: (msg: string, meta?: any) => recorded.debugCalls.push({ msg, meta }),
    info: () => {},
    warn: () => {},
    error: () => {},
    request: (data: any) => recorded.requestCalls.push(data),
    child: (ctx: any) => {
      recorded.childContexts.push(ctx);
      return makeChildLogger();
    },
  };
}

const rootLogger: any = {
  child: (ctx: any) => {
    recorded.childContexts.push(ctx);
    return makeChildLogger();
  },
  request: (data: any) => recorded.requestCalls.push(data),
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  close: () => {},
};

beforeEach(() => {
  recorded.childContexts.length = 0;
  recorded.debugCalls.length = 0;
  recorded.requestCalls.length = 0;
  setGlobalLoggerInstance(rootLogger);
});

afterEach(() => {
  clearGlobalLogger();
});

describe("requestSetup", () => {
  it("assigns a requestId and exposes it via the X-Request-ID header", async () => {
    const app = new Hono();
    app.use("*", requestSetup);
    app.get("/", (c) => c.text("ok", 200));

    const res = await app.request("/");
    const reqId = res.headers.get("X-Request-ID");
    expect(reqId).toBeTruthy();
    expect(reqId!.length).toBe(12); // nanoid(12)
  });

  it("sets an X-Response-Time header measuring request duration", async () => {
    const app = new Hono();
    app.use("*", requestSetup);
    app.get("/", (c) => c.text("ok"));

    const res = await app.request("/");
    const rt = res.headers.get("X-Response-Time");
    expect(rt).toMatch(/^\d+ms$/);
  });

  it("creates a child logger with requestId, method and path context", async () => {
    const app = new Hono();
    app.use("*", requestSetup);
    app.post("/users/create", (c) => c.text("ok"));

    await app.request("/users/create", { method: "POST" });

    expect(recorded.childContexts.length).toBeGreaterThanOrEqual(1);
    const ctx = recorded.childContexts[0];
    expect(ctx.method).toBe("POST");
    expect(ctx.path).toBe("/users/create");
    expect(typeof ctx.requestId).toBe("string");
    expect(ctx.requestId.length).toBe(12);
  });

  it("logs a 'Request started' debug entry with request metadata", async () => {
    const app = new Hono();
    app.use("*", requestSetup);
    app.get("/search", (c) => c.text("ok"));

    await app.request("/search?q=hello", {
      headers: { "user-agent": "test-agent", "x-forwarded-for": "1.2.3.4" },
    });

    const started = recorded.debugCalls.find(
      (d) => d.msg === "Request started",
    );
    expect(started).toBeDefined();
    expect(started!.meta.userAgent).toBe("test-agent");
    expect(started!.meta.ip).toBe("1.2.3.4");
    expect(started!.meta.query).toEqual({ q: "hello" });
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", async () => {
    const app = new Hono();
    app.use("*", requestSetup);
    app.get("/", (c) => c.text("ok"));

    await app.request("/", { headers: { "x-real-ip": "9.9.9.9" } });

    const started = recorded.debugCalls.find(
      (d) => d.msg === "Request started",
    );
    expect(started!.meta.ip).toBe("9.9.9.9");
  });

  it("logs a request summary with status and a measured duration", async () => {
    const app = new Hono();
    app.use("*", requestSetup);
    app.get("/", (c) => c.text("ok", 201));

    await app.request("/");

    expect(recorded.requestCalls.length).toBe(1);
    const summary = recorded.requestCalls[0];
    expect(summary.method).toBe("GET");
    expect(summary.path).toBe("/");
    expect(summary.status).toBe(201);
    expect(typeof summary.duration).toBe("number");
    expect(summary.duration).toBeGreaterThanOrEqual(0);
  });

  it("uses 'anonymous'/'none' identifier fallbacks when user/team are unset", async () => {
    const app = new Hono();
    app.use("*", requestSetup);
    app.get("/", (c) => c.text("ok"));

    await app.request("/");

    const summary = recorded.requestCalls[0];
    expect(summary.identifier).toEqual([
      { label: "userId", value: "anonymous" },
      { label: "teamId", value: "none" },
    ]);
  });

  it("uses the actual user.id and team.id when present in context", async () => {
    const app = new Hono();
    app.use("*", async (c, next) => {
      c.set("user", { id: "user-42" } as never);
      c.set("team", { id: "team-7" } as never);
      await next();
    });
    app.use("*", requestSetup);
    app.get("/", (c) => c.text("ok"));

    await app.request("/");

    const summary = recorded.requestCalls[0];
    expect(summary.identifier).toEqual([
      { label: "userId", value: "user-42" },
      { label: "teamId", value: "team-7" },
    ]);
  });
});
