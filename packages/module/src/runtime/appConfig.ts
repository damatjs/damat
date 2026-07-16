import { join } from "node:path";
import type { AppConfig, ProjectConfig } from "@damatjs/framework";
import type { ModuleManifest } from "../manifest/types";
import type { ModuleAppConfig } from "../config/types";

export interface BuildModuleAppConfigInput {
  /** Directory holding the module manifest and source entry. */
  moduleDir: string;
  manifest: ModuleManifest;
  /** Author overrides from module.config.ts */
  moduleConfig: ModuleAppConfig;
  /** Port override (takes precedence over config and env) */
  port?: number;
}

/** Default port for standalone module dev servers */
export const DEFAULT_MODULE_PORT = 7654;

/**
 * Build a full framework AppConfig for running ONE module standalone.
 * The module author only supplies module.config.ts overrides; defaults
 * cover everything else.
 */
export function buildModuleAppConfig(
  input: BuildModuleAppConfigInput,
): AppConfig {
  const { moduleDir, manifest, moduleConfig, port } = input;
  const overrides = moduleConfig.projectConfig ?? {};

  const projectConfig: ProjectConfig = {
    databaseUrl: process.env.DATABASE_URL ?? "",
    redisUrl: process.env.REDIS_URL,
    nodeEnv:
      (process.env.NODE_ENV as ProjectConfig["nodeEnv"]) ?? "development",
    loggerConfig: {
      level: "debug",
      format: "pretty",
      timestamp: true,
      prefix: manifest.name,
    },
    ...overrides,
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
    modules: {
      [manifest.name]: {
        resolve: manifest.paths?.entry
          ? join(moduleDir, manifest.paths.entry)
          : moduleDir,
        id: manifest.name,
      },
    },
  };
}
