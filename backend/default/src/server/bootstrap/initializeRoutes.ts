/**
 * Initialize file-based routes and register all route handlers
 */

import { Hono } from "@damatjs/deps/hono";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { getAuth } from "@/utils/auth";
import { createFileRouter, type FileRouter } from "@damatjs/utils/router";
import { notFoundHandler } from "@/api/middleware";
import { logger, getLogger } from "@/lib/logger";

import { createRootRoute, createApiRoutesRoute } from "../routes";
import { getProjectConfig } from '@damatjs/utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function initializeRoutes(app: Hono): Promise<FileRouter> {
  const projectConfig = getProjectConfig();

  // Create file-based router for API v1 routes
  const fileRouter = await createFileRouter({
    routesDir: join(__dirname, "..", "api", "routes"),
    debug: projectConfig.nodeEnv === "development",
    logger: getLogger(),
  });

  // Mount the file-based router
  app.route("/api", fileRouter.router);

  // Log registered routes in development
  if (projectConfig.nodeEnv === "development") {
    logger.info(fileRouter.getRouteList());
  }

  // Mount root route (API info)
  const rootRouter = createRootRoute(fileRouter);
  app.route("", rootRouter);

  // Mount API routes listing
  const apiRoutesRouter = createApiRoutesRoute(fileRouter);
  app.route("", apiRoutesRouter);

  // Better Auth handler (handles /api/auth/* routes)
  const auth = getAuth();
  app.on(["POST", "GET"], "/api/auth/*", (c) => {
    return auth.handler(c.req.raw);
  });

  // 404 handler
  app.notFound(notFoundHandler);

  return fileRouter;
}
