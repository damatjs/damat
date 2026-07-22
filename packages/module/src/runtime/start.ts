import { join } from "node:path";
import { bootstrap, resolveRuntime } from "@damatjs/framework";
import {
  getLogger,
  initializeServices,
  runServiceShutdownHandlers,
  type ServiceInstances,
} from "@damatjs/framework/services";
import { PoolManager } from "@damatjs/services";
import { applyStandaloneMigrations } from "./migrations";
import {
  assertModuleDatabaseConfigured,
  resolveModuleRuntimePlan,
} from "./plan";
import { closeServer, resolveServerPort, startHttpServer } from "./server";
import type {
  ModuleServerHandle,
  RunningModuleApp,
  StartModuleAppOptions,
} from "./types";

function moduleStop(
  server: ModuleServerHandle,
  services: ServiceInstances,
  graceMs?: number,
): () => Promise<void> {
  let stopping: Promise<void> | undefined;
  return () => {
    stopping ??= (async () => {
      try {
        await closeServer(server);
      } finally {
        await runServiceShutdownHandlers(
          services.shutdownHandlers,
          getLogger(),
          graceMs === undefined ? {} : { graceMs },
        );
      }
    })();
    return stopping;
  };
}

export async function startModuleApp(
  options: StartModuleAppOptions = {},
): Promise<RunningModuleApp> {
  const plan = await resolveModuleRuntimePlan(options);
  const http = plan.config.projectConfig.http;
  const host = http.host ?? "0.0.0.0";
  http.port = await resolveServerPort(http.port, host);
  assertModuleDatabaseConfigured(plan);
  let services: ServiceInstances | undefined;
  try {
    services = await initializeServices(
      plan.config,
      plan.packageDir,
      resolveRuntime(plan.config, {}),
      plan.capabilities.requiresDatabase
        ? {
            beforeDurability: async ({ logger }) =>
              applyStandaloneMigrations(PoolManager.getPool(), plan, logger),
          }
        : {},
    );
    const healthCheck = services.healthChecks
      ? {
          version: plan.manifest.version ?? "0.0.0",
          checks: services.healthChecks,
        }
      : undefined;
    const routes = plan.manifest.paths?.routes ?? "./api/routes";
    const { app, config } = await bootstrap({
      routesDir: join(plan.moduleDir, routes),
      projectConfig: plan.config.projectConfig,
      ...(healthCheck ? { healthCheck } : {}),
    });
    const { server, port } = await startHttpServer(
      app.fetch,
      config.port,
      host,
    );
    return {
      app,
      server,
      port,
      manifest: plan.manifest,
      capabilities: plan.capabilities,
      routeBasePath: plan.routeBasePath,
      stop: moduleStop(server, services, plan.config.runtime?.shutdownGraceMs),
    };
  } catch (error) {
    if (services)
      await runServiceShutdownHandlers(services.shutdownHandlers, getLogger());
    throw error;
  }
}
