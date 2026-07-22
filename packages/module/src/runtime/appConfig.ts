import type {
  AppConfig,
  ProjectConfig,
  ServicesConfig,
} from "@damatjs/framework";
import type { LogLevel } from "@damatjs/logger";
import type { ModuleManifest } from "../manifest/types";
import type { ModuleAppConfig } from "../config/types";
import {
  detectModuleCapabilities,
  type ModuleRuntimeCapabilities,
} from "./capabilities";

export interface BuildModuleAppConfigInput {
  moduleDir: string;
  manifest: ModuleManifest;
  entry?: string;
  moduleConfig: ModuleAppConfig;
  port?: number;
  capabilities?: ModuleRuntimeCapabilities;
}

export const DEFAULT_MODULE_PORT = 7654;
export const MODULE_DEV_POLL_INTERVAL_MS = 250;
export const MODULE_DEV_SHUTDOWN_GRACE_MS = 5_000;

function developmentServices(
  capabilities: ModuleRuntimeCapabilities,
): ServicesConfig | undefined {
  if (!capabilities.durable) return undefined;
  return {
    durability: { pollIntervalMs: MODULE_DEV_POLL_INTERVAL_MS },
    ...(capabilities.jobs ? { jobs: { concurrency: 1 } } : {}),
    ...(capabilities.events
      ? {
          events: {
            durable: {
              concurrency: 1,
              router: { pollIntervalMs: MODULE_DEV_POLL_INTERVAL_MS },
            },
          },
        }
      : {}),
    ...(capabilities.pipelines ? { pipelines: { concurrency: 1 } } : {}),
  };
}

export function buildModuleAppConfig(
  input: BuildModuleAppConfigInput,
): AppConfig {
  const { moduleDir, manifest, moduleConfig, port } = input;
  const overrides = moduleConfig.projectConfig ?? {};
  const { databaseUrl: configuredDatabaseUrl, ...projectOverrides } = overrides;
  const capabilities =
    input.capabilities ?? detectModuleCapabilities(moduleDir, manifest);
  const services = developmentServices(capabilities);

  const projectConfig: ProjectConfig = {
    redisUrl: process.env.REDIS_URL,
    nodeEnv:
      (process.env.NODE_ENV as ProjectConfig["nodeEnv"]) ?? "development",
    loggerConfig: {
      level: (process.env.LOG_LEVEL as LogLevel | undefined) ?? "debug",
      format: "pretty",
      timestamp: true,
      prefix: manifest.name,
    },
    ...projectOverrides,
    ...(capabilities.requiresDatabase
      ? {
          databaseUrl: configuredDatabaseUrl ?? process.env.DATABASE_URL ?? "",
        }
      : {}),
    http: {
      host: process.env.HOST || "0.0.0.0",
      ...overrides.http,
      port:
        port ??
        (process.env.PORT ? Number(process.env.PORT) : undefined) ??
        overrides.http?.port ??
        DEFAULT_MODULE_PORT,
    },
  };

  return {
    projectConfig,
    ...(services ? { services } : {}),
    runtime: {
      mode: "all",
      workers: capabilities.workers,
      shutdownGraceMs: MODULE_DEV_SHUTDOWN_GRACE_MS,
    },
    modules: {
      [manifest.name]: {
        resolve: moduleDir,
        id: manifest.name,
      },
    },
  };
}
