/**
 * Migration Creation
 *
 * Entry point for creating migration files.
 * Automatically detects whether to create an initial or diff migration
 * based on whether a snapshot already exists on disk.
 *
 * Models are auto-discovered from {modulesDir}/{moduleName}/models/.
 */

import path from "node:path";
import { snapshotExist } from "@/snapshot";
import type { CreateDiffMigrationOptions, DiffMigrationResult } from "@/types";
import { createInitialMigration } from "./initialMigration";
import { createDiffMigration } from "./diffMigration";

export { createInitialMigration } from "./initialMigration";
export { createDiffMigration } from "./diffMigration";

/** Default modules root directory */
export const DEFAULT_MODULES_DIR = "src/modules";

/**
 * Create a migration for a module.
 *
 * - If no snapshot exists: creates an initial migration (full CREATE TABLE SQL)
 * - If a snapshot exists: creates a diff migration (only the changes)
 *
 * Models are automatically discovered from:
 *   `{modulesDir}/{moduleName}/models/`
 *
 * @param moduleName  - Name of the module (e.g. `"user"`)
 * @param modulesDir  - Path to the modules directory (default: `"src/modules"`)
 * @param options     - Generation options
 * @returns
 *   - Initial migration: absolute path to the written `.ts` file
 *   - Diff migration: a `DiffMigrationResult` (may have `filePath: null` when no changes)
 *
 * @example
 * ```typescript
 * // Simplest usage — uses src/modules/user/models/ automatically
 * await createMigration('user');
 *
 * // Custom modules directory
 * await createMigration('billing', 'app/modules');
 * ```
 */
export async function createMigration(
  moduleName: string,
  modulesDir: string = DEFAULT_MODULES_DIR,
  options: CreateDiffMigrationOptions = {},
): Promise<string | DiffMigrationResult> {
  const migrationsDir = path.join(modulesDir, moduleName, "migrations");

  if (snapshotExist(migrationsDir)) {
    return createDiffMigration(moduleName, modulesDir, options);
  }

  return createInitialMigration(moduleName, modulesDir, options);
}
