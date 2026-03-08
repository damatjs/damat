/**
 * Bootstrap the entire application
 */

import { Hono } from "@damatjs/deps/hono";
import type { FileRouter } from "@damatjs/utils/router";

import { getProjectConfig } from '@damatjs/utils';
import { logger } from "@/lib/logger";

import { createApp } from "./createApp";
import { initializeServices } from "./initializeServices";
import { initializeRoutes } from "./initializeRoutes";

export async function bootstrap(): Promise<{
  app: Hono;
  fileRouter: FileRouter;
}> {
  const projectConfig = getProjectConfig();

  logger.info("Starting damatjs API...", {
    port: projectConfig.http.port,
    env: projectConfig.nodeEnv,
  });

  // Create and configure app
  const app = createApp();

  // Initialize services
  await initializeServices();

  // Initialize routes
  const fileRouter = await initializeRoutes(app);

  return { app, fileRouter };
}
