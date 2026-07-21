import type { Hono } from "@damatjs/deps/hono";
import type { FileRouter, RegisteredRoute } from "./types";

export function fileRouterResult(
  router: Hono,
  routes: RegisteredRoute[],
): FileRouter {
  return {
    router,
    routes,
    getRouteList: () => routeList(routes),
    getRoutesJson: () => routes.map(({ method, path }) => ({ method, path })),
  };
}

function routeList(routes: RegisteredRoute[]): string {
  const lines = ["Registered Routes:", ""];
  const grouped = new Map<string, string[]>();
  for (const route of routes) {
    if (!grouped.has(route.path)) grouped.set(route.path, []);
    grouped.get(route.path)!.push(route.method);
  }
  for (const [path, methods] of grouped)
    lines.push(`  ${methods.join(", ").padEnd(25)} ${path}`);
  return lines.join("\\n");
}
