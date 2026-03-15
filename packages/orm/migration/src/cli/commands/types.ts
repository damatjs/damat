/**
 * CLI Command Types
 *
 * Shared types for command handlers.
 */

import type { Pool } from "@damatjs/deps/pg";

/**
 * Command handler result
 */
export interface CommandResult {
  /** Exit code (0 = success, 1 = error) */
  exitCode: number;
  /** pg Pool to close after the command (if opened) */
  pool?: Pool;
}
