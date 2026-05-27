import { Hono } from "@damatjs/deps/hono";
import type { MiddlewareHandler } from "@damatjs/deps/hono";
import { relative } from "path";
import { pathToFileURL } from "url";
import type { RegisteredRoute, RouteModule, CreateFileRouterOptions, FileRouter } from "./types";
import { scanDirectory, sortRoutes } from "./scanner";

export async function createFileRouter(
  options: CreateFileRouterOptions,
): Promise<FileRouter> {
  const {
    basePath = "",
    routesDir,
    globalMiddleware = [],
    debug = false,
    logger,
  } = options;

  const router = new Hono();
  const registeredRoutes: RegisteredRoute[] = [];

  const scannedRoutes = scanDirectory(routesDir);
  const routeFiles = sortRoutes(scannedRoutes);

  if (debug) {
    logger.info("File router: Scanning routes", {
      routesDir,
      found: routeFiles.length,
    });
  }

  for (const { urlPath, filePath } of routeFiles) {
    try {
      const fileUrl = pathToFileURL(filePath).href;
      const module = (await import(fileUrl)) as RouteModule;

      const fullPath = `${basePath}${urlPath === "/" ? "" : urlPath}` || "/";

      const routeMiddleware: MiddlewareHandler[] = [
        ...globalMiddleware,
        ...(module.middleware || []),
      ];

      if (routeMiddleware.length > 0) {
        for (const mw of routeMiddleware) {
          router.use(fullPath, mw);
        }
      }

      const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

      for (const method of methods) {
        const handler = module[method];
        if (handler) {
          router.on(method, fullPath, handler);

          const relPath = relative(routesDir, filePath);
          registeredRoutes.push({
            method,
            path: fullPath,
            filePath: relPath,
            hasMiddleware: routeMiddleware.length > 0,
          });

          if (debug) {
            logger.info(`Registered route: ${method} ${fullPath}`, {
              file: relPath,
            });
          }
        }
      }
    } catch (err) {
      logger.error(
        `Failed to load route: ${filePath}`,
        err instanceof Error ? err : undefined,
      );
      throw new Error(`Failed to load route ${filePath}: ${err}`);
    }
  }

  return {
    router,
    routes: registeredRoutes,

    getRouteList(): string {
      const lines = ["Registered Routes:", ""];
      const grouped = new Map<string, string[]>();

      for (const route of registeredRoutes) {
        const key = route.path;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(route.method);
      }

      for (const [path, methods] of grouped) {
        lines.push(`  ${methods.join(", ").padEnd(25)} ${path}`);
      }

      return lines.join("\n");
    },

    getRoutesJson() {
      return registeredRoutes.map((r) => ({
        method: r.method,
        path: r.path,
      }));
    },
  };
}
