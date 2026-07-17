import { expect, test } from "bun:test";
import type { MiddlewareHandler } from "@damatjs/deps/hono";
import type { AppConfig } from "../../config";
import { startHttpRuntime } from "../../runtime/http";
import type { ServiceInstances } from "../../services/types";
import { createHttpFixture } from "./http-fixture";

test("HTTP runtime forwards configured routes, health, hooks, and auth", async () => {
  const fixture = createHttpFixture();
  const beforeRoutes = async () => {};
  const authHandler: MiddlewareHandler = async (_context, next) => next();
  const authRoutes = () => {};
  const database = async () => ({ status: "up" });
  const config: AppConfig = {
    projectConfig: {
      http: {
        port: 3000,
        host: "localhost",
        api: { entryRouterPath: "custom/routes" },
      },
    },
    hooks: { beforeRoutes },
  };
  const services = {
    shutdownHandlers: [],
    healthChecks: { database },
    resolvedModules: new Map([
      ["billing", { routes: "/modules/billing/routes" }],
      ["catalog", { routes: undefined }],
    ]),
    auth: {
      handlers: { session: authHandler },
      mountRoutes: authRoutes,
    },
  } as unknown as ServiceInstances;

  const result = await startHttpRuntime(
    config,
    "/workspace",
    services,
    fixture.dependencies,
  );

  expect(fixture.bootstrapOptions).toEqual([
    {
      routesDir: "/workspace/custom/routes",
      routeProviders: [
        { routesDir: "/modules/billing/routes", basePath: "/billing" },
      ],
      projectConfig: config.projectConfig,
      healthCheck: { version: "2.0.0", checks: { database } },
      hooks: { beforeRoutes },
      authHandlers: { session: authHandler },
      authRoutes,
    },
  ]);
  expect(fixture.serverCalls).toEqual([
    [fixture.app, fixture.serverConfig, fixture.logger],
  ]);
  expect(result).toBe(fixture.handle);
});
