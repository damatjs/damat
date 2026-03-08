import type { Options } from "@damatjs/deps/mikro-orm/postgresql";
import type { DatabaseModule } from "./module";

// =============================================================================
// CLI
// =============================================================================

/**
 * CLI options for migration commands
 */
export interface CliOptions {
  /** MikroORM configuration */
  ormConfig: Options;
  /** Path to modules directory */
  modulesDir: string;
  /** List of active module names */
  activeModules: string[];
  /** Database modules with entities (required for create command) */
  modules?: DatabaseModule[];
  command: string;
}
