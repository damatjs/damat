
import { initializeServices, getLogger } from "./services";
import { bootstrap } from "./bootstrap";
import { startServer } from "./server";
import { setupShutdownHandlers, registerShutdown } from "./shutdown";
import { loadConfigAsync } from './config/loader';

export async function start(cwd: string = process.cwd()): Promise<void> {
  const config = await loadConfigAsync(cwd);
  const services = await initializeServices(config);

  const healthCheck = services.healthChecks
    ? { version: "2.0.0", checks: services.healthChecks }
    : undefined;

  const { app, config: serverConfig } = await bootstrap({
    routesDir: `${cwd}/src/api/routes`,
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
