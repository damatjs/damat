import type { DatabaseConfig } from "./config";

// =============================================================================
// CLI
// =============================================================================
``
/**
 * CLI options for migration commands
 */
export interface CliOptions {
  /** Database connection configuration */
  database: DatabaseConfig;
  /** Path to modules directory (default: "src/modules") */
  modulesDir?: string;
  /** Database modules (optional — models auto-discovered when omitted) */
  modules?: string[];
  /** CLI sub-command to run */
  command: string;
}
