import { initializeServices, getLogger } from "./services";
import { bootstrap } from "./bootstrap";
import { startServer } from "./server";
import { setupShutdownHandlers, registerShutdown } from "./shutdown";
import { loadConfigAsync } from "./config";

export async function start(cwd: string = process.cwd()): Promise<void> {
  const config = await loadConfigAsync(cwd);

  // Lifecycle hooks are awaited and fail startup when they throw — a broken
  // hook must never boot a half-configured server.
  const hooks = config.hooks;
  if (hooks?.beforeServices) {
    await hooks.beforeServices({
      config: config.projectConfig,
      logger: getLogger(),
    });
  }

  const services = await initializeServices(config);

  if (hooks?.afterServices) {
    await hooks.afterServices({
      config: config.projectConfig,
      logger: getLogger(),
    });
  }

  const healthCheck = services.healthChecks
    ? { version: "2.0.0", checks: services.healthChecks }
    : undefined;

  const routesDirPath =
    config.projectConfig.http.api?.entryRouterPath ?? `/src/api/routes`;
  const routesDir = `${cwd}/${routesDirPath}`;
  const routeProviders = [...(services.resolvedModules ?? new Map())]
    .filter(([, module]) => Boolean(module.routes))
    .map(([id, module]) => ({
      routesDir: module.routes!,
      basePath: `/${id}`,
    }));

  const { app, config: serverConfig } = await bootstrap({
    routesDir,
    ...(routeProviders.length && { routeProviders }),
    projectConfig: config.projectConfig,
    healthCheck,
    hooks,
    ...(services.auth ? { authHandlers: services.auth.handlers } : {}),
    ...(services.auth?.mountRoutes
      ? { authRoutes: services.auth.mountRoutes }
      : {}),
  });

  const logger = getLogger();
  setupShutdownHandlers(logger);

  for (const handler of services.shutdownHandlers) {
    registerShutdown(handler);
  }

  startServer(app, serverConfig, getLogger());
}

export async function runEntry(): Promise<void> {
  try {
    await start();
  } catch (e) {
    console.error("Failed to start server:", e);
    process.exit(1);
  }
}
