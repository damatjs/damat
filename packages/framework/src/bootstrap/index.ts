import { Hono } from "@damatjs/deps/hono";
import { setupMiddleware, notFoundHandler } from "../middleware";
import { handleError } from "../middleware/error/handleError";
import {
  createRootRoute,
  createApiRoutesRoute,
  createHealthRoute,
} from "../handlers";
import type { BootstrapOptions, BootstrapResult } from "../types";
import { getLogger } from "../services";
import { createBootstrapFileRouter } from "./fileRouter";

export async function bootstrap(
  options: BootstrapOptions,
): Promise<BootstrapResult> {
  const {
    routesDir,
    routeProviders = [],
    projectConfig,
    healthCheck,
    authHandlers,
    hooks,
  } = options;

  const logger = getLogger();

  logger.info("Starting server...", { port: projectConfig.http.port });

  const app = new Hono();

  // Hono v4 routes handler-thrown errors straight to onError — they never
  // unwind through middleware, so the errorHandler middleware alone cannot
  // give them the framework's JSON error envelope. Install both.
  app.onError((err, c) => handleError(c, err, logger));

  setupMiddleware({
    app,
    logger,
    corsConfig: projectConfig.http.corsConfig,
  });

  // The app exists but no endpoint routes are registered yet. A throwing hook fails
  // startup — never boot a half-configured server.
  if (hooks?.beforeRoutes)
    await hooks.beforeRoutes({ config: projectConfig, logger, app });

  const fileRouter = await createBootstrapFileRouter({
    routesDir,
    routeProviders,
    projectConfig,
    authHandlers,
  });

  const entryPathUrl = projectConfig.http.api?.entryRouter ?? "/api";
  app.route(entryPathUrl, fileRouter.router);

  // if (projectConfig.nodeEnv === "development")
  //   logger.info(fileRouter.getRouteList());

  if (projectConfig.nodeEnv === "development")
    app.route(
      "",
      createRootRoute(
        fileRouter,
        projectConfig.releaseVersion ?? healthCheck?.version,
      ),
    );
  if (projectConfig.nodeEnv === "development")
    app.route("", createApiRoutesRoute(fileRouter));

  if (healthCheck)
    app.route(
      "",
      createHealthRoute(healthCheck, projectConfig.http.api?.healthCheckRouter),
    );

  // Every route is registered; the 404 handler has not been installed yet.
  if (hooks?.afterRoutes)
    await hooks.afterRoutes({ config: projectConfig, logger, app });

  app.notFound(notFoundHandler);
  return {
    app,
    config: {
      port: projectConfig.http.port,
      host: projectConfig.http.host,
      nodeEnv: projectConfig.nodeEnv,
    },
  };
}
