import { Hono } from "@damatjs/deps/hono";
import type {
  CreateFileRouterOptions,
  FileRouter,
  RegisteredRoute,
} from "./types";
import { scanDirectory, sortRoutes } from "./scanner";
import { registerRouteFile } from "./registerRouteFile";
import { fileRouterResult } from "./result";

export async function createFileRouter(
  options: CreateFileRouterOptions,
): Promise<FileRouter> {
  const router = new Hono();
  const registeredRoutes: RegisteredRoute[] = [];
  const routeFiles = sortRoutes(scanDirectory(options.routesDir));
  if (options.debug)
    options.logger.info("File router: Scanning routes", {
      routesDir: options.routesDir,
      found: routeFiles.length,
    });

  for (const route of routeFiles) {
    try {
      await registerRouteFile(router, route, options, registeredRoutes);
    } catch (error) {
      options.logger.error(
        `Failed to load route: ${route.filePath}`,
        error instanceof Error ? error : undefined,
      );
      throw new Error(`Failed to load route ${route.filePath}: ${error}`);
    }
  }
  return fileRouterResult(router, registeredRoutes);
}
