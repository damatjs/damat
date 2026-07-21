import { expect, test } from "bun:test";
import type { AppConfig } from "../../config";
import { startHttpRuntime } from "../../runtime/http";
import type { ServiceInstances } from "../../services/types";
import { createHttpFixture } from "./http-fixture";

test("HTTP runtime supplies default routes and omits absent integrations", async () => {
  const fixture = createHttpFixture();
  const config: AppConfig = {
    projectConfig: { http: { port: 3000, host: "localhost" } },
  };
  const services: ServiceInstances = { shutdownHandlers: [] };

  const result = await startHttpRuntime(
    config,
    "/workspace",
    services,
    fixture.dependencies,
  );

  expect(fixture.bootstrapOptions).toEqual([
    {
      routesDir: "/workspace/src/api/routes",
      projectConfig: config.projectConfig,
      healthCheck: undefined,
      hooks: undefined,
    },
  ]);
  expect(fixture.serverCalls).toEqual([
    [fixture.app, fixture.serverConfig, fixture.logger],
  ]);
  expect(result).toBe(fixture.handle);
});
