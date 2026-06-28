import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createFileRouter } from "../../router/builder";

const SCRATCH = "/tmp/claude-0/-home-user-damat/481a0807-5e66-5762-ac17-c771e29d585e/scratchpad";

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
  });
});
