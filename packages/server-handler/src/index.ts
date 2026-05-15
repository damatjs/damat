import { waitForInit } from "@damatjs/utils";
import { bootstrap } from "./bootstrap";
import { startServer } from "./server";
import { setupShutdownHandlers, registerShutdown } from "./shutdown";
import type { Logger, ILogger, ShutdownHandler } from "./types";

interface CreateServerOptions {
  config: any;
  services: { 
    setup: () => void; 
    logger: Logger | ILogger; 
    redisCheck?: () => Promise<{ status: string; latency?: number }>;
    shutdown?: ShutdownHandler[] 
  };
  customRoutes?: (app: any, fileRouter: any) => void;
}

export async function createServer(options: CreateServerOptions): Promise<void> {
  const { config, services, customRoutes } = options;

  await waitForInit(config);
  services.setup();

  const healthCheck = services.redisCheck ? { version: "2.0.0", checks: { redis: services.redisCheck } } : undefined;
  const opts: any = {
    routesDir: `${process.cwd()}/src/api/routes`,
    projectConfig: config.projectConfig,
  };
  if (healthCheck) opts.healthCheck = healthCheck;
  if (customRoutes) opts.customRoutes = customRoutes;

  const { app, config: serverConfig } = await bootstrap(opts);

  services.shutdown?.forEach(h => registerShutdown(h));
  setupShutdownHandlers(services.logger);

  startServer(app, serverConfig, services.logger);
}

export { bootstrap } from "./bootstrap";
export { startServer } from "./server";
export { setupShutdownHandlers, registerShutdown } from "./shutdown";
export type { BootstrapOptions, BootstrapResult, ServerConfig, ShutdownHandler, HealthCheckConfig, Logger, ILogger } from "./types";
