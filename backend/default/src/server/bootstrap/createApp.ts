/**
 * Create and configure the Hono application
 */

import { Hono } from "@damatjs/deps/hono";

import { initLogger } from "@/lib/logger";
import { applyGlobalMiddleware } from "../middleware";
import { createHealthRoute } from "../routes";

export function createApp(): Hono {
  const app = new Hono();

  // Initialize logger with config
  initLogger();

  // Apply global middleware
  applyGlobalMiddleware(app);

  // Mount health check route
  const healthRouter = createHealthRoute();
  app.route("", healthRouter);

  return app;
}
