import type { AppConfig } from "./types";
import { initDatabase, loadModules } from './loader/database';
import { initProjectConfig } from './instance/project';

export function defineConfig(config: AppConfig): AppConfig & { _initPromise?: Promise<void> } {

  if (!config.projectConfig.databaseUrl) {
    throw new Error("DATABASE_URL is not defined");
  }

  // TODO: Revaluation this setup should the data connection be here
  const initPromise = initDatabase(config.projectConfig.databaseUrl)
    .then(async () => {
      initProjectConfig(config.projectConfig);
      if (config.modules && config.modules.length > 0) {
        await loadModules(config.modules);
      }
    });

  const result: AppConfig & { _initPromise?: Promise<void> } = {
    projectConfig: config.projectConfig,
  };

  if (config.modules) {
    result.modules = config.modules;
  }

  result._initPromise = initPromise;
  return result;
}

export async function waitForInit(config: { _initPromise?: Promise<void> }): Promise<void> {
  if (config._initPromise) {
    await config._initPromise;
  }
}
