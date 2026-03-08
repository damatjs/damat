/**
 * App Configuration Types
 *
 * Types for the complete application configuration defined in damat.config.ts.
 */

import type { ProjectConfig } from "./project";

/**
 * Complete application configuration defined in damat.config.ts
 *
 * @example
 * ```typescript
 * export default defineConfig({
 *   projectConfig: {
 *     databaseUrl: process.env.DATABASE_URL,
 *     http: { port: 3000, host: '0.0.0.0' },
 *   },
 *   modules: [userModule, billingModule],
 * });
 * ```
 */
export interface AppConfig<TModules extends readonly any[] = readonly any[]> {
  /** Project-level configuration (database, server, etc.) */
  projectConfig: ProjectConfig;

  /** Modules from defineModule() */
  modules: TModules;
}
