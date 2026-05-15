/**
 * Config Module - Define Config
 *
 * Function to define application configuration with type safety.
 */

import type { ProjectConfig } from "../types";

let projectConfigInstance: ProjectConfig | undefined;

/**
 * Get the project config instance.
 */
export function initProjectConfig(config: ProjectConfig): void {
  if (projectConfigInstance) {
    return;
  }
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is not defined");
  }
  projectConfigInstance = config;
}

/**
 * Get the project config instance.
 */
export function getProjectConfig(): ProjectConfig {
  if (!projectConfigInstance) {
    throw new Error("Project config is not initialized");
  }
  return projectConfigInstance;
}



/**
 * Reset the project config instance.
 */
export function resetProjectConfig(): void {
  projectConfigInstance = undefined;
}

