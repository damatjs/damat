import { Hono } from "@damatjs/deps/hono";
import type { FileRouter } from "../router";

export function createRootRoute(fileRouter: FileRouter): Hono {
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
      name: "Damatjs Backend Infrustcutre",
      version: "1.0.0",
      description:
        "Backend Infrustcutre to build and not repeat.",
      documentation: "https://docs.damatjs.dev",
      defaultEndpoints: endpoints
    });
  });

  return rootRouter;
}
