/**
 * API Routes Listing
 * Provides endpoint for listing all registered API routes
 */

import { Hono } from "@damatjs/deps/hono";
import type { FileRouter } from "@damatjs/utils/router";

/**
 * Create API routes listing endpoint
 */
export function createApiRoutesRoute(fileRouter: FileRouter): Hono {
  const apiRoutesRouter = new Hono();

  /**
   * GET /api/routes
   * List all registered API routes (useful for debugging and documentation)
   */
  apiRoutesRouter.get("/api/routes", (c) => {
    return c.json({
      success: true,
      data: {
        routes: fileRouter.getRoutesJson(),
        count: fileRouter.routes.length,
      },
    });
  });

  return apiRoutesRouter;
}
