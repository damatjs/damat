/**
 * Migration Creation
 *
 * Entry point for creating migration files.
 * Automatically detects whether to create an initial or diff migration
 * based on whether a snapshot already exists on disk.
 */

import path from "node:path";
import type {
  ModelDefinition,
  ModelProperties,
} from "@damatjs/orm-model/types";
import { snapshotExist } from "@/snapshot";
import type { CreateDiffMigrationOptions, DiffMigrationResult } from "@/types";
import { createInitialMigration } from "./initialMigration";
import { createDiffMigration } from "./diffMigration";

export { createInitialMigration } from "./initialMigration";
export { createDiffMigration } from "./diffMigration";

/**
 * Create a migration for a module.
 *
 * - If no snapshot exists for the module: creates an initial migration that
 *   generates full CREATE TABLE SQL for every model.
 * - If a snapshot already exists: creates a diff migration that generates
 *   only the statements needed to move from the old schema to the new one.
 *
 * @param modulesDir - Path to the modules directory
 * @param moduleName - Name of the module
 * @param name       - Human-readable label for the migration (e.g. "Initial", "AddPhoneColumn")
 * @param models     - Model definitions for the module
 * @param options    - Generation options
 * @returns
 *   - Initial migration: the absolute path to the written `.ts` file
 *   - Diff migration: a `DiffMigrationResult` (may have `filePath: null` when there are no changes)
 */
export function createMigration(
  modulesDir: string,
  moduleName: string,
  name: string,
  models: ModelDefinition<ModelProperties>[],
  options: CreateDiffMigrationOptions = {},
): string | DiffMigrationResult {
  const migrationsDir = path.join(modulesDir, moduleName, "migrations");

  if (snapshotExist(migrationsDir)) {
    return createDiffMigration(modulesDir, moduleName, name, models, options);
  }

  return createInitialMigration(modulesDir, moduleName, name, models, options);
}
