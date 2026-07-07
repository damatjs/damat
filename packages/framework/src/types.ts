import { ProjectConfig } from './config';
import type { AuthMiddlewareOptions } from "./middleware/auth";

export type { Logger, ILogger } from "@damatjs/logger";
export type { AuthMiddlewareOptions } from "./middleware/auth";

export interface ServerConfig {
  port: number;
  host?: string | undefined;
  nodeEnv?: string | undefined;
}

export interface HealthCheckFn {
  (): Promise<{ status: string; latency?: number, data?: any }>;
}

export interface HealthCheckConfig {
  version?: string | undefined;
  checks?: {
    database?: HealthCheckFn;
    redis?: HealthCheckFn;
  } | undefined;
}

export interface BootstrapOptions {
  routesDir: string;
  projectConfig: ProjectConfig;
  healthCheck?: HealthCheckConfig | undefined;
  authHandlers?: AuthMiddlewareOptions | undefined;
}

export interface BootstrapResult {
  app: any;
  config: ServerConfig;
}

export interface ShutdownHandler {
  name: string;
  handler: () => Promise<void> | void;
}
