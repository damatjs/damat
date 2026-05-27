import type { Hono, MiddlewareHandler } from "@damatjs/deps/hono";
import type { HttpRateLimitConfig, HttpAuthConfig } from "../../config";

export interface RegisteredRoute {
  method: string;
  path: string;
  filePath: string;
  hasMiddleware: boolean;
  hasValidator: boolean;
  hasRateLimit: boolean;
  hasAuth: boolean;
}

export interface FileRouterOptions {
  basePath?: string;
  routesDir: string;
  globalMiddleware?: MiddlewareHandler[];
  debug?: boolean;
}

export interface ScannedRoute {
  urlPath: string;
  filePath: string;
}

export interface FileRouter {
  router: Hono;
  routes: RegisteredRoute[];
  getRouteList(): string;
  getRoutesJson(): Array<{ method: string; path: string }>;
}

export interface CreateFileRouterOptions extends FileRouterOptions {
  logger: Logger;
  rateLimit?: HttpRateLimitConfig | undefined;
  auth?: HttpAuthConfig | undefined;
}

export interface Logger {
  info: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, error?: Error) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  debug: (message: string, data?: Record<string, unknown>) => void;
}

export interface ResolvedConfig {
  rateLimit?: HttpRateLimitConfig;
  auth?: HttpAuthConfig;
  globalRateLimit?: HttpRateLimitConfig;
}
