/**
 * CLI Command Types
 *
 * Shared types for command handlers.
 */

import type { MikroORM } from "@damatjs/deps/mikro-orm/postgresql";

/**
 * Command handler result
 */
export interface CommandResult {
  /** Exit code (0 = success, 1 = error) */
  exitCode: number;
  /** ORM instance to close (if opened) */
  orm?: MikroORM;
}
