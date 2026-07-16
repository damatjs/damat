import { Hono } from "@damatjs/deps/hono";
import type { FileRouter } from "./types";

export function aggregateFileRouters(routers: FileRouter[]): FileRouter {
  const router = new Hono();
  for (const item of routers) router.route("", item.router);
  const routes = routers.flatMap((item) => item.routes);
  return {
    router,
    routes,
    getRouteList: () =>
      [
        "Registered Routes:",
        "",
        ...routes.map((route) => `${route.method.padEnd(7)} ${route.path}`),
      ].join("\n"),
    getRoutesJson: () => routes.map(({ method, path }) => ({ method, path })),
  };
}
