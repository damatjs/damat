import { join } from "node:path";
import { serve } from "@damatjs/deps/hono";
import { bootstrap } from "@damatjs/framework";
import { initializeServices, getLogger } from "@damatjs/framework/services";
import { PoolManager } from "@damatjs/services";
import { readModuleManifest } from "../manifest/read";
import { loadModuleConfig } from "../config/load";
import { applyModuleMigrations } from "../harness/migrate";
import { locateModuleDir } from "./locate";
import { buildModuleAppConfig } from "./appConfig";
import type { RunningModuleApp, StartModuleAppOptions } from "./types";

type ClosableServer = {
  close(cb: (err?: Error) => void): void;
  closeIdleConnections?: () => void;
  closeAllConnections?: () => void;
};

/**
 * Close the HTTP server, forcing any lingering connections shut.
 *
 * A graceful `server.close()` resolves only once every connection has ended.
 * Under Node a keep-alive or still-active socket — e.g. a POST whose request
 * body the route never read — never closes on its own, so teardown hangs
 * forever. Closing idle + all connections makes `close()` resolve. The calls are
 * `?.`-guarded so runtimes whose server lacks them (e.g. Bun, where `close()`
 * already resolves promptly) are a harmless no-op.
 */
export async function closeServer(server: ClosableServer): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
    server.closeIdleConnections?.();
    server.closeAllConnections?.();
  });
}

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
  const moduleConfig = await loadModuleConfig(packageDir);

  const config = buildModuleAppConfig({
    moduleDir,
    manifest,
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

  const { app, config: serverConfig } = await bootstrap({
    routesDir: join(moduleDir, "api", "routes"),
    projectConfig: config.projectConfig,
    ...(healthCheck ? { healthCheck } : {}),
  });

  const { server, port } = await new Promise<{
    server: RunningModuleApp["server"];
    port: number;
  }>((resolve) => {
    const handle = serve(
      { fetch: app.fetch, port: serverConfig.port },
      (info: { port: number }) => {
        logger.info(`Module "${manifest.name}" running`, {
          url: `http://localhost:${info.port}`,
        });
        resolve({ server: handle, port: info.port });
      },
    );
  });

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
