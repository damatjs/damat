
import { initializeServices, getLogger } from "./services";
import { bootstrap } from "./bootstrap";
import { startServer } from "./server";
import { setupShutdownHandlers, registerShutdown } from "./shutdown";
import { loadConfigAsync } from './config';

export async function start(cwd: string = process.cwd()): Promise<void> {
  const config = await loadConfigAsync(cwd);
  const services = await initializeServices(config);

  const healthCheck = services.healthChecks
    ? { version: "2.0.0", checks: services.healthChecks }
    : undefined;


  const routesDirPath = config.projectConfig.http.api?.entryRouterPath ?? `/src/api/routes`;
  const routesDir = `${cwd}/${routesDirPath}`;

  const { app, config: serverConfig } = await bootstrap({
    routesDir,
    projectConfig: config.projectConfig,
    healthCheck,
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

runEntry();
