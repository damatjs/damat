import type { DatabaseConfig } from "./config";
import type { DatabaseModule } from "./module";

// =============================================================================
// CLI
// =============================================================================

/**
 * CLI options for migration commands
 */
export interface CliOptions {
  /** Database connection configuration */
  database: DatabaseConfig;
  /** Path to modules directory (default: "src/modules") */
  modulesDir?: string;
  /** List of active module names */
  activeModules: string[];
  /** Database modules (optional — models auto-discovered when omitted) */
  modules?: DatabaseModule[];
  /** CLI sub-command to run */
  command: string;
}
