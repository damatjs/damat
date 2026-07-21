import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bootstrap } from "../bootstrap";
import { createRootRoute } from "../handlers";
import { errorHandler } from "../middleware/error";
import type { FileRouter } from "../router";
import type { ProjectConfig } from "../config";
import { setGlobalLoggerInstance, clearGlobalLogger } from "../services/logger";

const recordingLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  child: () => recordingLogger,
  request: () => {},
  close: () => {},
};

const projectConfig: ProjectConfig = {
  nodeEnv: "test",
  http: { port: 0, host: "127.0.0.1" },
};

let routesDir: string;

beforeEach(() => {
  routesDir = mkdtempSync(join(tmpdir(), "damat-bootstrap-hooks-"));
  setGlobalLoggerInstance(recordingLogger as never);
});

afterEach(() => {
  rmSync(routesDir, { recursive: true, force: true });
  clearGlobalLogger();
});

describe("bootstrap lifecycle hooks", () => {
  it("runs beforeRoutes/afterRoutes in order with the app in context", async () => {
    const order: string[] = [];

    const { app } = await bootstrap({
      routesDir,
      projectConfig,
      hooks: {
        beforeRoutes: (ctx) => {
          order.push("beforeRoutes");
          expect(ctx.app).toBeDefined();
          expect(ctx.config).toBe(projectConfig);
          // A route added here is registered before the file router.
          ctx.app!.get("/hook-added", (c) => c.text("from hook"));
        },
        afterRoutes: async (ctx) => {
          order.push("afterRoutes");
          expect(ctx.app).toBeDefined();
        },
      },
    });

    expect(order).toEqual(["beforeRoutes", "afterRoutes"]);

    // The hook-added route actually resolves (it beat the 404 handler).
    const res = await app.request("/hook-added");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("from hook");
  });

  it("boots without hooks exactly as before", async () => {
    const { app, config } = await bootstrap({ routesDir, projectConfig });
    expect(config.port).toBe(0);
    const res = await app.request("/definitely-not-a-route");
    expect(res.status).toBe(404);
  });

  it("development mode registers the /damat info and route-list endpoints", async () => {
    const { app } = await bootstrap({
      routesDir,
      projectConfig: { ...projectConfig, nodeEnv: "development" },
      healthCheck: { checks: {} },
    });

    const info = await app.request("/damat");
    expect(info.status).toBe(200);
    const infoBody = (await info.json()) as {
      defaultEndpoints: Record<string, string>;
    };
    expect(infoBody.defaultEndpoints["GET /damat"]).toBe("API information");

    const routes = await app.request("/damat/api/routes");
    expect(routes.status).toBe(200);
    const routesBody = (await routes.json()) as {
      success: boolean;
      data: { count: number };
    };
    expect(routesBody.success).toBe(true);
    expect(routesBody.data.count).toBe(0); // empty routesDir

    const health = await app.request("/health");
    expect(health.status).toBe(200);
  });

  it("the error middleware turns a throwing route into a JSON error response", async () => {
    const { app } = await bootstrap({
      routesDir,
      projectConfig,
      hooks: {
        beforeRoutes: (ctx) => {
          ctx.app!.get("/boom", () => {
            throw new Error("route exploded");
          });
        },
      },
    });

    const res = await app.request("/boom");
    expect(res.status).toBe(500);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(false);
  });

  it("the /damat info route groups registered routes by path", async () => {
    const fakeRouter = {
      routes: [{ path: "/user", method: "GET" }],
    } as unknown as FileRouter;
    const root = createRootRoute(fakeRouter);
    const res = await root.request("/damat");
    expect(res.status).toBe(200);
  });

  it("the errorHandler middleware catches a rejecting next()", async () => {
    const middleware = errorHandler(recordingLogger as never);
    const fakeContext = {
      get: () => "req-1",
      req: { method: "GET", path: "/x" },
      json: (body: unknown, status: number) =>
        new Response(JSON.stringify(body), { status }),
    };
    const res = (await middleware(fakeContext as never, async () => {
      throw new Error("middleware blew up");
    })) as Response;
    expect(res.status).toBe(500);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(false);
  });

  it("a throwing hook fails startup loudly", async () => {
    await expect(
      bootstrap({
        routesDir,
        projectConfig,
        hooks: {
          beforeRoutes: () => {
            throw new Error("hook exploded");
          },
        },
      }),
    ).rejects.toThrow("hook exploded");
  });
});
