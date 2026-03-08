import { Hono } from "@damatjs/deps/hono";
import type { MiddlewareHandler } from "@damatjs/deps/hono";
import { relative } from "path";
import { pathToFileURL } from "url";
import type { FileRouterOptions, RegisteredRoute, RouteModule } from "./types";
import { scanDirectory, sortRoutes } from "./scanner";
import type { Logger } from "../logger";

export interface FileRouter {
  router: Hono;
  routes: RegisteredRoute[];
  /** Get a formatted list of all routes */
  getRouteList(): string;
  /** Get routes as JSON for API documentation */
  getRoutesJson(): Array<{ method: string; path: string }>;
}

export interface CreateFileRouterOptions extends FileRouterOptions {
  logger: Logger;
}

/**
 * Create a file-based router
 */
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

  // Scan for route files
  const scannedRoutes = scanDirectory(routesDir);
  const routeFiles = sortRoutes(scannedRoutes);

  if (debug) {
    logger.info("File router: Scanning routes", {
      routesDir,
      found: routeFiles.length,
    });
  }

  // Load and register each route
  for (const { urlPath, filePath } of routeFiles) {
    try {
      // Dynamic import of route module
      const fileUrl = pathToFileURL(filePath).href;
      const module = (await import(fileUrl)) as RouteModule;

      const fullPath = `${basePath}${urlPath === "/" ? "" : urlPath}` || "/";

      // Collect middleware for this route file
      const routeMiddleware: MiddlewareHandler[] = [
        ...globalMiddleware,
        ...(module.middleware || []),
      ];

      // Apply middleware once per route path (for all methods)
      if (routeMiddleware.length > 0) {
        for (const mw of routeMiddleware) {
          router.use(fullPath, mw);
        }
      }

      // Register each HTTP method
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
