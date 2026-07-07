import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createFileRouter } from "../../router/builder";

// Use the OS temp dir so the suite works on any machine (including CI), not a
// session-specific scratchpad path.
const SCRATCH = tmpdir();

let root: string;

function recordingLogger() {
  const errors: { msg: string; err?: Error }[] = [];
  const infos: { msg: string; meta?: any }[] = [];
  return {
    logger: {
      info: (msg: string, meta?: any) => infos.push({ msg, meta }),
      error: (msg: string, err?: Error) => errors.push({ msg, err }),
      warn: () => {},
      debug: () => {},
    } as never,
    errors,
    infos,
  };
}

// Each route lives in its own directory as a `route.ts` file (per scanner rules).
function writeRoute(relDir: string, body: string) {
  const dir = relDir ? join(root, relDir) : root;
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "route.ts"), body);
}

beforeEach(() => {
  root = mkdtempSync(join(SCRATCH, "damat-builder-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("createFileRouter", () => {
  it("registers a simple GET route and serves it", async () => {
    writeRoute("hello", `export const GET = (c) => c.text("hi from hello");`);

    const { logger } = recordingLogger();
    const fr = await createFileRouter({ routesDir: root, logger });

    expect(fr.routes).toHaveLength(1);
    expect(fr.routes[0]!.method).toBe("GET");
    expect(fr.routes[0]!.path).toBe("/hello");

    const res = await fr.router.request("/hello");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("hi from hello");
  });

  it("registers nothing for a route file with no HTTP method exports", async () => {
    writeRoute("nomethods", `export const middleware = [];`);

    const { logger } = recordingLogger();
    const fr = await createFileRouter({ routesDir: root, logger });

    expect(fr.routes).toHaveLength(0);
    const res = await fr.router.request("/nomethods");
    expect(res.status).toBe(404);
  });

  it("registers each declared HTTP method on the same path", async () => {
    writeRoute(
      "multi",
      `export const GET = (c) => c.text("g");
       export const POST = (c) => c.text("p");
       export const DELETE = (c) => c.text("d");`,
    );

    const { logger } = recordingLogger();
    const fr = await createFileRouter({ routesDir: root, logger });

    const methods = fr.routes.map((r) => r.method).sort();
    expect(methods).toEqual(["DELETE", "GET", "POST"]);

    expect((await fr.router.request("/multi")).status).toBe(200);
    expect((await fr.router.request("/multi", { method: "POST" })).status).toBe(200);
    expect((await fr.router.request("/multi", { method: "DELETE" })).status).toBe(200);
  });

  it("logs an error and throws a wrapped error when a route file throws on import", async () => {
    writeRoute("boom", `throw new Error("explode on import");`);

    const { logger, errors } = recordingLogger();

    await expect(createFileRouter({ routesDir: root, logger })).rejects.toThrow(
      /Failed to load route/,
    );
    expect(errors.some((e) => /Failed to load route/.test(e.msg))).toBe(true);
  });

  it("attaches rate-limit metadata when method config provides a rateLimit (config precedence)", async () => {
    // module.config provides a route-level rateLimit; resolveMethodConfig should
    // surface it as hasRateLimit on the registered route.
    writeRoute(
      "limited",
      `export const GET = (c) => c.text("ok");
       export const config = { method: "GET", rateLimit: { requests: 5, window: "1m" } };`,
    );

    const { logger } = recordingLogger();
    const fr = await createFileRouter({ routesDir: root, logger });

    const route = fr.routes.find((r) => r.path === "/limited" && r.method === "GET");
    expect(route).toBeDefined();
    expect(route!.hasRateLimit).toBe(true);
    expect(route!.hasMiddleware).toBe(true);

    // A request within the limit reaches the handler.
    expect((await fr.router.request("/limited")).status).toBe(200);
  });

  it("marks hasAuth when method config provides auth", async () => {
    writeRoute(
      "secured",
      `export const GET = (c) => c.text("ok");
       export const config = { method: "GET", auth: { type: "session" } };`,
    );

    const { logger } = recordingLogger();
    const fr = await createFileRouter({ routesDir: root, logger });

    const route = fr.routes.find((r) => r.path === "/secured" && r.method === "GET");
    expect(route).toBeDefined();
    expect(route!.hasAuth).toBe(true);

    // No handler is configured for "session", so auth fails closed with 401.
    expect((await fr.router.request("/secured")).status).toBe(401);
  });

  it("runs the supplied authHandler for the route's auth type and allows the request", async () => {
    writeRoute(
      "session-secured",
      `export const GET = (c) => c.text("ok");
       export const config = { method: "GET", auth: { type: "session" } };`,
    );

    const { logger } = recordingLogger();
    const fr = await createFileRouter({
      routesDir: root,
      logger,
      authHandlers: {
        session: async (c, next) => {
          c.set("userId", "u1");
          await next();
        },
      },
    });

    // The configured session handler runs and passes the request through.
    const res = await fr.router.request("/session-secured");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });

  it("applies basePath as a prefix to registered routes", async () => {
    writeRoute("widgets", `export const GET = (c) => c.text("ok");`);

    const { logger } = recordingLogger();
    const fr = await createFileRouter({ routesDir: root, basePath: "/api", logger });

    expect(fr.routes[0]!.path).toBe("/api/widgets");
    expect((await fr.router.request("/api/widgets")).status).toBe(200);
  });

  it("returns no routes for an empty routes directory", async () => {
    const { logger } = recordingLogger();
    const fr = await createFileRouter({ routesDir: root, logger });
    expect(fr.routes).toHaveLength(0);
  });

  it("getRoutesJson returns method/path pairs", async () => {
    writeRoute("a", `export const GET = (c) => c.text("ok");`);
    writeRoute("b", `export const POST = (c) => c.text("ok");`);

    const { logger } = recordingLogger();
    const fr = await createFileRouter({ routesDir: root, logger });

    const json = fr.getRoutesJson();
    expect(json).toContainEqual({ method: "GET", path: "/a" });
    expect(json).toContainEqual({ method: "POST", path: "/b" });

    // Exercise the registered handlers so the fixtures are fully covered.
    expect((await fr.router.request("/a")).status).toBe(200);
    expect((await fr.router.request("/b", { method: "POST" })).status).toBe(200);
  });

  it("logs scanning + per-route registration details when debug is enabled", async () => {
    writeRoute("dbg", `export const GET = (c) => c.text("ok");`);

    const { logger, infos } = recordingLogger();
    const fr = await createFileRouter({ routesDir: root, debug: true, logger });

    // The scan summary and the per-route registration line are both logged.
    expect(infos.some((i) => /Scanning routes/.test(i.msg))).toBe(true);
    expect(infos.some((i) => /Registered route: GET \/dbg/.test(i.msg))).toBe(true);
    expect((await fr.router.request("/dbg")).status).toBe(200);
  });

  it("applies route-level middleware exported by the module", async () => {
    writeRoute(
      "guarded",
      `export const middleware = [async (c, next) => { c.header("x-mw", "1"); await next(); }];
       export const GET = (c) => c.text("ok");`,
    );

    const { logger } = recordingLogger();
    const fr = await createFileRouter({ routesDir: root, logger });

    const route = fr.routes.find((r) => r.path === "/guarded");
    expect(route!.hasMiddleware).toBe(true);

    const res = await fr.router.request("/guarded");
    expect(res.status).toBe(200);
    expect(res.headers.get("x-mw")).toBe("1");
  });

  it("registers a validator middleware when the module declares validators", async () => {
    // The validator middleware only needs a `{ parse }` shape; using a plain
    // pass-through schema keeps the fixture free of cross-package imports it
    // cannot resolve from the OS temp dir.
    writeRoute(
      "validated",
      `const querySchema = { parse: (data) => data };
       export const validators = [{ method: "GET", query: querySchema }];
       export const GET = (c) => c.text("ok");`,
    );

    const { logger } = recordingLogger();
    const fr = await createFileRouter({ routesDir: root, logger });

    const route = fr.routes.find((r) => r.path === "/validated" && r.method === "GET");
    expect(route!.hasValidator).toBe(true);

    // The validator runs and passes the request through to the handler.
    expect((await fr.router.request("/validated?q=hi")).status).toBe(200);
  });

  it("getRouteList renders a grouped, human-readable route table", async () => {
    writeRoute(
      "list",
      `export const GET = (c) => c.text("g");
       export const POST = (c) => c.text("p");`,
    );

    const { logger } = recordingLogger();
    const fr = await createFileRouter({ routesDir: root, logger });

    const text = fr.getRouteList();
    expect(text).toContain("Registered Routes:");
    expect(text).toContain("/list");
    // GET and POST on the same path are grouped onto one line.
    expect(text).toMatch(/GET, POST.*\/list/);

    // Exercise the registered handlers so the fixture is fully covered.
    expect((await fr.router.request("/list")).status).toBe(200);
    expect((await fr.router.request("/list", { method: "POST" })).status).toBe(200);
  });
});
