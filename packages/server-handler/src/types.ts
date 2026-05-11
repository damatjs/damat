import type { LogLevel, LogFormat, Logger } from "@damatjs/utils";

export type { Logger } from "@damatjs/utils";

export interface ServerConfig {
  port: number;
  host?: string | undefined;
  nodeEnv?: string | undefined;
}

export interface HealthCheckConfig {
  version?: string;
  checks?: Record<string, () => Promise<{ status: string; latency?: number }>>;
}

export interface BootstrapOptions {
  routesDir: string;
  projectConfig: {
    databaseUrl: string;
    redisUrl?: string;
    http: {
      port: number;
      host?: string;
      corsOrigin: string;
    };
    nodeEnv?: string;
    logLevel?: LogLevel;
    logFormat?: LogFormat;
  };
  healthCheck?: HealthCheckConfig | undefined;
  customRoutes?: (app: any, fileRouter: any) => void | undefined;
}

export interface BootstrapResult {
  app: any;
  config: ServerConfig;
}

export interface ShutdownHandler {
  name: string;
  handler: () => Promise<void> | void;
}

export interface ServicesConfig {
  setup: () => void;
  logger: Logger;
  redisCheck?: () => Promise<{ status: string; latency?: number }>;
  shutdown?: ShutdownHandler[];
}
