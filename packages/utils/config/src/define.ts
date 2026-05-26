import type { AppConfig } from "./types";

export function defineConfig(config: AppConfig): AppConfig {
  if (!config.projectConfig.databaseUrl) {
    throw new Error("databaseUrl is required in projectConfig");
  }

  return config;
}
