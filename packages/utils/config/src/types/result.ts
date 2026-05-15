/**
 * Config Result Types
 *
 * Types for the result of loading configuration.
 */

import type { ProjectConfig } from "./project";

/**
 * Result of loading configuration.
 * Returned by loadAppConfig().
 */
export interface ConfigResult<
  TModules extends readonly any[] = readonly any[],
> {
  /** Project configuration (database, server, etc.) */
  projectConfig: ProjectConfig;

  /** Registered modules */
  modules: TModules;
}
