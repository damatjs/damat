import { join } from "node:path";
import { bootstrap } from "@damatjs/framework";
import { initializeServices, getLogger } from "@damatjs/framework/services";
import { PoolManager } from "@damatjs/services";
import { readModuleManifest } from "../manifest/read";
import { resolveModuleEntry } from "../manifest/entry";
import { loadModuleConfig } from "../config/load";
import { applyModuleMigrations } from "../harness/migrate";
import { locateModuleDir } from "./locate";
import { buildModuleAppConfig } from "./appConfig";
import { closeServer, startHttpServer } from "./server";
import type { RunningModuleApp, StartModuleAppOptions } from "./types";

export { closeServer } from "./server";

/**
 * Run ONE module as a live app — the framework's full HTTP stack
 * (middleware, file routes from the module's api/ dir, health checks)
 * with just this module registered.
 *
 * This is what `damat module dev` boots, and what API tests start
 * in-process with `port: 0`.
 */
export async function startModuleApp(
  options: StartModuleAppOptions = {},
): Promise<RunningModuleApp> {
  const packageDir = options.packageDir ?? process.cwd();
  const moduleDir = locateModuleDir(packageDir);
  const manifest = readModuleManifest(moduleDir);
  const entry = resolveModuleEntry(moduleDir, manifest);
  const moduleConfig = await loadModuleConfig(packageDir);

  const config = buildModuleAppConfig({
    moduleDir,
    manifest,
    entry,
    moduleConfig,
    ...(options.port !== undefined ? { port: options.port } : {}),
  });

  // Database + redis + logger + this module's registration
  const services = await initializeServices(config, packageDir);
  const logger = getLogger();

  // The module owns its schema — apply its migrations before serving
  if (config.projectConfig.databaseUrl) {
    await applyModuleMigrations(
      PoolManager.getPool(),
      moduleDir,
      manifest,
      logger,
    );
  }

  const healthCheck = services.healthChecks
    ? { version: manifest.version ?? "0.0.0", checks: services.healthChecks }
    : undefined;

  const routes = manifest.paths?.routes ?? "./api/routes";
  const { app, config: serverConfig } = await bootstrap({
    routesDir: join(moduleDir, routes),
    projectConfig: config.projectConfig,
    ...(healthCheck ? { healthCheck } : {}),
  });

  const { server, port } = await startHttpServer(
    app.fetch,
    serverConfig.port,
    (boundPort) =>
      logger.info(`Module "${manifest.name}" running`, {
        url: `http://localhost:${boundPort}`,
      }),
  );

  return {
    app,
    server,
    port,
    manifest,
    stop: async () => {
      await closeServer(server);
      for (const { handler } of services.shutdownHandlers) {
        try {
          await handler();
        } catch {
          // shutdown handlers must not mask each other
        }
      }
    },
  };
}
