import { Hono } from "@damatjs/deps/hono";
import type { MiddlewareHandler } from "@damatjs/deps/hono";
import { relative } from "path";
import { pathToFileURL } from "url";
import type {
  RegisteredRoute,
  RouteModule,
  CreateFileRouterOptions,
  FileRouter,
  HttpMethod,
} from "./types";
import { scanDirectory, sortRoutes } from "./scanner";
import { createValidatorMiddleware } from "../middleware/validator";
import { createRateLimitMiddleware } from "../middleware/rateLimit";
import { createAuthMiddleware } from "../middleware/auth";
import { resolveMethodConfig } from "./resolveMethodConfig";

export async function createFileRouter(
  options: CreateFileRouterOptions,
): Promise<FileRouter> {
  const {
    basePath = "",
    routesDir,
    globalMiddleware = [],
    debug = false,
    logger,
    rateLimit: globalRateLimit,
    auth: globalAuth,
    authHandlers,
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

      const methods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

      for (const method of methods) {
        const handler = module[method];
        if (handler) {
          const resolvedConfig = resolveMethodConfig(
            method,
            module.config,
            module.configs,
            globalRateLimit,
            globalAuth,
          );

          let hasMethodMiddleware = false;

          if (resolvedConfig.rateLimit) {
            router.on(
              method,
              fullPath,
              createRateLimitMiddleware(
                resolvedConfig.rateLimit,
                resolvedConfig.globalRateLimit,
              ),
            );
            hasMethodMiddleware = true;
          }

          if (resolvedConfig.auth) {
            router.on(
              method,
              fullPath,
              createAuthMiddleware(resolvedConfig.auth.type, authHandlers),
            );
            hasMethodMiddleware = true;
          }

          const validator = module.validators?.find((v) => v.method === method);
          if (validator) {
            router.on(method, fullPath, createValidatorMiddleware(validator));
            hasMethodMiddleware = true;
          }
          router.on(method, fullPath, handler);

          const relPath = relative(routesDir, filePath);
          registeredRoutes.push({
            method,
            path: fullPath,
            filePath: relPath,
            hasMiddleware: routeMiddleware.length > 0 || hasMethodMiddleware,
            hasValidator: !!validator,
            hasRateLimit: !!resolvedConfig.rateLimit,
            hasAuth: !!resolvedConfig.auth,
          });

          if (debug) {
            logger.info(`Registered route: ${method} ${fullPath}`, {
              file: relPath,
              hasValidator: !!validator,
              hasRateLimit: !!resolvedConfig.rateLimit,
              hasAuth: !!resolvedConfig.auth,
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

      return lines.join("\\n");
    },

    getRoutesJson() {
      return registeredRoutes.map((r) => ({
        method: r.method,
        path: r.path,
      }));
    },
  };
}
