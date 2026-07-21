import type { Hono } from "@damatjs/deps/hono";
import { ProjectConfig } from "./config";
import type { LifecycleHooks } from "./config";
import type { AuthMiddlewareOptions } from "./middleware/auth";
import type { ShutdownRegistration } from "./shutdown/types";

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
  checks?: Record<string, HealthCheckFn | undefined> | undefined;
}

export interface BootstrapOptions {
  routesDir: string;
  routeProviders?: RouteProvider[] | undefined;
  projectConfig: ProjectConfig;
  healthCheck?: HealthCheckConfig | undefined;
  authHandlers?: AuthMiddlewareOptions | undefined;
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

export type ShutdownHandler = ShutdownRegistration;
export type { ShutdownPhase } from "./shutdown/types";
