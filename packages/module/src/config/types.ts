import type { ProjectConfig, HttpConfig } from "@damatjs/framework";

/**
 * The module-custom configuration — the ONLY thing a module author has to
 * set up. Everything else (server, database wiring, migrations, tests) is
 * provided by the module runtime.
 *
 * Lives in `module.config.ts` at the module package root.
 */
export interface ModuleAppConfig {
  /**
   * Overrides merged over the runtime's standalone defaults
   * (port, logger, etc). Database/redis come from DATABASE_URL/REDIS_URL.
   */
  projectConfig?: Omit<Partial<ProjectConfig>, "http"> & {
    http?: Partial<HttpConfig>;
  };
}
