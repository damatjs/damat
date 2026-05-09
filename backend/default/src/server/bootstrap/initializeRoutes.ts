/**
 * Initialize file-based routes and register all route handlers
 */

import { Hono } from "@damatjs/deps/hono";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { getAuth } from "@/utils/auth";
import { createFileRouter, type FileRouter } from "../../../../../packages/server-handler/dist/router";
import { createRootRoute, createApiRoutesRoute, createHealthRoute } from "../../../../../packages/server-handler/dist/handlers";
import { notFoundHandler } from "@/api/middleware";
import { logger, getLogger } from "@/lib/logger";
import { getProjectConfig } from '@damatjs/utils';
import { getRedis } from "@/lib/redis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function initializeRoutes(app: Hono): Promise<FileRouter> {
  const projectConfig = getProjectConfig();

  const fileRouter = await createFileRouter({
    routesDir: join(__dirname, "..", "..", "api", "routes"),
    debug: projectConfig.nodeEnv === "development",
    logger: getLogger(),
  });

  app.route("/api", fileRouter.router);

  if (projectConfig.nodeEnv === "development") {
    logger.info(fileRouter.getRouteList());
  }

  const rootRouter = createRootRoute(fileRouter);
  app.route("", rootRouter);

  const apiRoutesRouter = createApiRoutesRoute(fileRouter);
  app.route("", apiRoutesRouter);

  const healthRouter = createHealthRoute({
    version: "2.0.0",
    checks: {
      redis: async () => {
        const redis = getRedis();
        const start = Date.now();
        await redis.ping();
        return { status: "healthy", latency: Date.now() - start };
      },
    },
  });
  app.route("", healthRouter);

  const auth = getAuth();
  app.on(["POST", "GET"], "/api/auth/*", (c) => {
    return auth.handler(c.req.raw);
  });

  app.notFound(notFoundHandler);

  return fileRouter;
}
