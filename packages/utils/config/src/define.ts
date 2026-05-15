/**
 * Config Module - Define Config
 *
 * Function to define application configuration with type safety.
 */

import type { AppConfig } from "./types";
import { initDatabase } from './loader/database';
import { initProjectConfig } from './instance/project';

export function defineConfig<TModules extends readonly any[] = readonly any[]>(
  config: AppConfig<TModules>,
): AppConfig<TModules> & { _initPromise?: Promise<void> } {

  if (!config.projectConfig.databaseUrl) {
    throw new Error("DATABASE_URL is not defined");
  }

  const initPromise = initDatabase<TModules>({
    databaseUrl: config.projectConfig.databaseUrl,
    modules: config.modules,
  }).then(() => {
    initProjectConfig(config.projectConfig);
  });

  return {
    projectConfig: config.projectConfig,
    modules: config.modules as TModules,
    _initPromise: initPromise,
  };
}

export async function waitForInit(config: { _initPromise?: Promise<void> }): Promise<void> {
  if (config._initPromise) {
    await config._initPromise;
  }
}
