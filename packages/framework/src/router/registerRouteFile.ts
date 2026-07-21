import type { Hono, MiddlewareHandler } from "@damatjs/deps/hono";
import { pathToFileURL } from "node:url";
import type {
  CreateFileRouterOptions,
  RegisteredRoute,
  RouteModule,
  ScannedRoute,
} from "./types";
import { registerRouteMethods } from "./registerRouteMethods";

export async function registerRouteFile(
  router: Hono,
  route: ScannedRoute,
  options: CreateFileRouterOptions,
  registeredRoutes: RegisteredRoute[],
): Promise<void> {
  const module = (await import(
    pathToFileURL(route.filePath).href
  )) as RouteModule;
  const fullPath =
    `${options.basePath ?? ""}${route.urlPath === "/" ? "" : route.urlPath}` ||
    "/";
  const middleware: MiddlewareHandler[] = [
    ...(options.globalMiddleware ?? []),
    ...(module.middleware ?? []),
  ];
  for (const handler of middleware) router.use(fullPath, handler);
  registerRouteMethods({
    router,
    module,
    fullPath,
    filePath: route.filePath,
    middlewareCount: middleware.length,
    options,
    registeredRoutes,
  });
}
