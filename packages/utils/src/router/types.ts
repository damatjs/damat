import type { Context, MiddlewareHandler } from "@damatjs/deps/hono";

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
    window: string; // e.g., '1m', '1h'
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
  /** Base path for all routes (e.g., '/api/v1') */
  basePath?: string;
  /** Directory containing route files */
  routesDir: string;
  /** Global middleware to apply to all routes */
  globalMiddleware?: MiddlewareHandler[];
  /** Enable debug logging */
  debug?: boolean;
}

export interface ScannedRoute {
  urlPath: string;
  filePath: string;
}

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];
