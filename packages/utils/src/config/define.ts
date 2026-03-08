/**
 * Config Module - Define Config
 *
 * Function to define application configuration with type safety.
 */

import { loadEnv } from '../env';
import type { AppConfig } from "./types";
import { initDatabase } from './loader/database';
import { initProjectConfig } from './instance/project';

/**
 * Define application configuration.
 *
 * @param config - Application configuration
 * @returns The configuration object
 *
 * @example
 * ```typescript
 * import { defineConfig, loadEnv } from '@damatjs/utils';
 * import userModule from './src/modules/user';
 *
 * loadEnv(process.env.NODE_ENV || 'development', process.cwd());
 *
 * export default defineConfig({
 *   projectConfig: {
 *     databaseUrl: process.env.DATABASE_URL,
 *     http: {
 *       port: Number(process.env.PORT) || 3000,
 *     },
 *   },
 *   modules: [userModule],
 *   featureFlags: {},
 * });
 * ```
 */
export const defineConfig = <TModules extends readonly any[] = readonly any[]>(
  config: AppConfig<TModules>,
): AppConfig<TModules> => {

  // Load environment variables
  loadEnv(process.env.NODE_ENV || "development", process.cwd());

  if (!config.projectConfig.databaseUrl) {
    throw new Error("DATABASE_URL is not defined");
  }

  //TODO: let not make the database a required one and also setup a filter for the modules for the non database modules
  initDatabase<TModules>({
    databaseUrl: config.projectConfig.databaseUrl,
    modules: config.modules,
  })

  initProjectConfig(config.projectConfig);

  //TODO: Add the redis one as well

  return {
    projectConfig: config.projectConfig,
    modules: config.modules as TModules,
  };
}
