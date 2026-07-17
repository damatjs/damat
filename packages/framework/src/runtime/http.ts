import { join } from "node:path";
import type { Hono } from "@damatjs/deps/hono";
import type { ILogger, Logger } from "@damatjs/logger";
import { bootstrap } from "../bootstrap";
import type { AppConfig } from "../config";
import { startServer, type ServerHandle } from "../server";
import { getLogger } from "../services";
import type { ServiceInstances } from "../services/types";
import type { BootstrapOptions, BootstrapResult, ServerConfig } from "../types";

export interface HttpRuntimeDependencies {
  bootstrap(options: BootstrapOptions): Promise<BootstrapResult>;
  startServer(
    app: Hono,
    config: ServerConfig,
    logger: Logger | ILogger,
  ): ServerHandle;
  getLogger(): Logger | ILogger;
}

const defaultDependencies: HttpRuntimeDependencies = {
  bootstrap,
  startServer,
  getLogger,
};

export async function startHttpRuntime(
  config: AppConfig,
  cwd: string,
  services: ServiceInstances,
  dependencies: HttpRuntimeDependencies = defaultDependencies,
): Promise<ServerHandle> {
  const healthCheck = services.healthChecks
    ? { version: "2.0.0", checks: services.healthChecks }
    : undefined;
  const path =
    config.projectConfig.http.api?.entryRouterPath ?? "src/api/routes";
  const routeProviders = [...(services.resolvedModules ?? new Map())]
    .filter(([, module]) => Boolean(module.routes))
    .map(([id, module]) => ({
      routesDir: module.routes!,
      basePath: `/${id}`,
    }));
  const { app, config: serverConfig } = await dependencies.bootstrap({
    routesDir: join(cwd, path),
    ...(routeProviders.length > 0 && { routeProviders }),
    projectConfig: config.projectConfig,
    healthCheck,
    hooks: config.hooks,
    ...(services.auth ? { authHandlers: services.auth.handlers } : {}),
    ...(services.auth?.mountRoutes
      ? { authRoutes: services.auth.mountRoutes }
      : {}),
  });
  return dependencies.startServer(app, serverConfig, dependencies.getLogger());
}
