/**
 * Create and configure the Hono application
 */

import { Hono } from "@damatjs/deps/hono";

import { initLogger } from "@/lib/logger";
import { applyGlobalMiddleware } from "../middleware";

export function createApp(): Hono {
  const app = new Hono();

  initLogger();

  applyGlobalMiddleware(app);

  return app;
}
