import { Hono } from "@damatjs/deps/hono";
import type { FileRouter } from "../router";

export function createRootRoute(
  fileRouter: FileRouter,
  version = "unknown",
): Hono {
  const rootRouter = new Hono();

  rootRouter.get("/damat", (c) => {
    const routesByPath: Record<string, string[]> = {};
    for (const route of fileRouter.routes) {
      if (!routesByPath[route.path]) {
        routesByPath[route.path] = [route.method];
      }
    }

    const endpoints: Record<string, string> = {
      "GET /damat": "API information",
      "GET /health": "Health check",
      "GET /damat/api/routes": "List all registered routes",
    };

    return c.json({
      name: "Damat.js Backend Infrastructure",
      version,
      description: "Composable backend infrastructure for Damat applications.",
      documentation: "https://docs.damatjs.com",
      defaultEndpoints: endpoints,
    });
  });

  return rootRouter;
}
