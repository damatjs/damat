import { Hono } from "@damatjs/deps/hono";
import { createFileRouter } from "../router";
import { setupMiddleware, notFoundHandler } from "../middleware";
import { createRootRoute, createApiRoutesRoute, createHealthRoute } from "../handlers";
import type { BootstrapOptions, BootstrapResult } from "../types";
import { getLogger } from '../services';

export async function bootstrap(options: BootstrapOptions): Promise<BootstrapResult> {
  const {
    routesDir,
    projectConfig,
    healthCheck,
    authHandlers
  } = options;

  const logger = getLogger();

  logger.info("Starting server...", { port: projectConfig.http.port });

  const app = new Hono();

  setupMiddleware({
    app,
    logger,
    corsConfig: projectConfig.http.corsConfig
  });

  const fileRouter = await createFileRouter({
    routesDir,
    debug: projectConfig.nodeEnv === "development",
    logger,
    rateLimit: projectConfig.http.rateLimit,
    auth: projectConfig.http.auth,
    authHandlers,
  });

  const entryPathUrl = projectConfig.http.api?.entryRouter ?? "/api";
  app.route(entryPathUrl, fileRouter.router);

  if (projectConfig.nodeEnv === "development") logger.info(fileRouter.getRouteList());

  if (projectConfig.nodeEnv === "development") app.route("", createRootRoute(fileRouter));
  if (projectConfig.nodeEnv === "development") app.route("", createApiRoutesRoute(fileRouter));

  if (healthCheck)
    app.route("", createHealthRoute(healthCheck, projectConfig.http.api?.healthCheckRouter));

  app.notFound(notFoundHandler);

  return {
    app,
    config:
    {
      port: projectConfig.http.port,
      host: projectConfig.http.host,
      nodeEnv: projectConfig.nodeEnv
    }
  };
}
