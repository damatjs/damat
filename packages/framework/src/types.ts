import type { Hono } from "@damatjs/deps/hono";
import { ProjectConfig } from "./config";
import type { LifecycleHooks } from "./config";
import type { AuthMiddlewareOptions } from "./middleware/auth";

export type { Logger, ILogger } from "@damatjs/logger";
export type { AuthMiddlewareOptions } from "./middleware/auth";

export interface ServerConfig {
  port: number;
  host?: string | undefined;
  nodeEnv?: string | undefined;
}

export interface HealthCheckFn {
  (): Promise<{ status: string; latency?: number; data?: unknown }>;
}

export interface HealthCheckConfig {
  version?: string | undefined;
  checks?:
    | {
        database?: HealthCheckFn;
        redis?: HealthCheckFn;
      }
    | undefined;
}

export interface BootstrapOptions {
  routesDir: string;
  routeProviders?: RouteProvider[] | undefined;
  projectConfig: ProjectConfig;
  healthCheck?: HealthCheckConfig | undefined;
  authHandlers?: AuthMiddlewareOptions | undefined;
  /** Mount provider-owned auth routes (Better Auth's `/api/auth/*`) before the file router. */
  authRoutes?: ((app: Hono) => void) | undefined;
  hooks?: LifecycleHooks | undefined;
}

export interface RouteProvider {
  routesDir: string;
  basePath?: string | undefined;
}

export interface BootstrapResult {
  app: Hono;
  config: ServerConfig;
}

export interface ShutdownHandler {
  name: string;
  handler: () => Promise<void> | void;
}
