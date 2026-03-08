/**
 * Root Route
 * Provides API information and documentation at the root endpoint
 */

import { Hono } from "@damatjs/deps/hono";
import type { FileRouter } from "@damatjs/utils/router";
// import { PLAN_CONFIGS } from "../../lib/config";

/**
 * Create root route handler with API documentation
 */
export function createRootRoute(fileRouter: FileRouter): Hono {
  const rootRouter = new Hono();

  /**
   * GET /
   * API information and available endpoints (dynamically generated from file router)
   */
  rootRouter.get("/", (c) => {
    // Group routes by base path for documentation
    const routesByPath: Record<string, string[]> = {};
    for (const route of fileRouter.routes) {
      if (!routesByPath[route.path]) {
        routesByPath[route.path] = [];
      }
      // routesByPath[route.path].push(route.method);
    }

    // Generate endpoints documentation
    const endpoints: Record<string, string> = {
      "GET /": "API information",
      "GET /health": "Health check",
      "GET /api/routes": "List all registered routes",
      "POST /api/auth/*": "Better Auth endpoints",
    };

    for (const [path, methods] of Object.entries(routesByPath)) {
      for (const method of methods) {
        endpoints[`${method} ${path}`] = `Auto-discovered from file router`;
      }
    }

    return c.json({
      name: "Asset Gallery API",
      version: "2.0.0",
      description:
        "API for searching design inspiration sections using semantic similarity",
      documentation: "https://docs.damatjs.dev",
      routing: "Next.js-style file-based routing (browse src/routes/)",
      endpoints,
      authentication: {
        session: {
          method: "Session cookie (automatic via Better Auth)",
          example: "Cookies are set automatically on sign-in",
        },
        apiKey: {
          method: "API key via Authorization header or X-API-Key",
          example: "Authorization: Bearer ag_xxx or X-API-Key: ag_xxx",
        },
      },
      // plans: Object.entries(PLAN_CONFIGS).map(([name, planConfig]) => ({
      //   name,
      //   credits: planConfig.credits === -1 ? "unlimited" : planConfig.credits,
      //   rateLimit: planConfig.rateLimit,
      // })),
    });
  });

  return rootRouter;
}
