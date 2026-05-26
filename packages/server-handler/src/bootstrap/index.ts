import { Hono } from "@damatjs/deps/hono";
import { createFileRouter } from "../router";
import { setupMiddleware, notFoundHandler } from "../middleware";
import { createRootRoute, createApiRoutesRoute, createHealthRoute } from "../handlers";
import type { BootstrapOptions, BootstrapResult } from "../types";
import { Logger } from "@damatjs/logger";

export async function bootstrap(options: BootstrapOptions): Promise<BootstrapResult> {
  const { routesDir, projectConfig, healthCheck } = options;

  const logLevel = projectConfig.loggerConfig?.level;
  const logFormat = projectConfig.loggerConfig?.format;
  const logger = new Logger({ level: logLevel || "info", format: logFormat || "pretty" });

  logger.info("Starting server...", { port: projectConfig.http.port });

  const app = new Hono();
  setupMiddleware(app, projectConfig.http.corsOrigin, logger);

  const fileRouter = await createFileRouter({ routesDir, debug: projectConfig.nodeEnv === "development", logger });
  app.route("/api", fileRouter.router);

  if (projectConfig.nodeEnv === "development") logger.info(fileRouter.getRouteList());

  app.route("", createRootRoute(fileRouter));
  app.route("", createApiRoutesRoute(fileRouter));
  if (healthCheck) app.route("", createHealthRoute(healthCheck));
  app.notFound(notFoundHandler);

  return { app, config: { port: projectConfig.http.port, host: projectConfig.http.host, nodeEnv: projectConfig.nodeEnv } };
}
