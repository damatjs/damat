import { Hono } from "@damatjs/deps/hono";
import type { FileRouter } from "../router";

export function createApiRoutesRoute(fileRouter: FileRouter): Hono {
  const apiRoutesRouter = new Hono();

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
