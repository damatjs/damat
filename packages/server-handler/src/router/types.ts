import type { Context, Hono, MiddlewareHandler } from "@damatjs/deps/hono";

export type RouteHandler = (c: Context) => Promise<Response> | Response;

export interface RouteModule {
  GET?: RouteHandler;
  POST?: RouteHandler;
  PUT?: RouteHandler;
  PATCH?: RouteHandler;
  DELETE?: RouteHandler;
  middleware?: MiddlewareHandler[];
  config?: RouteConfig;
}

export interface RouteConfig {
  rateLimit?: {
    requests: number;
    window: string;
  };
  auth?: "session" | "apiKey" | "flexible" | "none";
}

export interface RegisteredRoute {
  method: string;
  path: string;
  filePath: string;
  hasMiddleware: boolean;
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

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export interface Logger {
  info: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, error?: Error) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  debug: (message: string, data?: Record<string, unknown>) => void;
}


export interface FileRouter {
  router: Hono;
  routes: RegisteredRoute[];
  getRouteList(): string;
  getRoutesJson(): Array<{ method: string; path: string }>;
}

export interface CreateFileRouterOptions extends FileRouterOptions {
  logger: Logger;
}