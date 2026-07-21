/**
 * Diff-Based Migration Creation
 *
 * Creates migrations based on the difference between current model definitions
 * and the previous schema snapshot.
 *
 * Models are auto-discovered from {modulesDir}/{moduleName}/models/.
 */

import fs from "node:fs";
import path from "node:path";
import { diffSchemas, loadSnapshot } from "@damatjs/orm-processor";
import { toModuleSchema } from "@damatjs/orm-model";
import { discoverModels } from "../discovery";
import { writeDiffMigration } from "./writeDiffMigration";
import type {
  CreateDiffMigrationOptions,
  DiffMigrationResult,
} from "@damatjs/orm-processor";

export interface DiffMigrationLayout {
  migrationsDir?: string;
}

/**
 * Create a migration based on the difference between the current model
 * definitions and the previous schema snapshot.
 *
 * Models are auto-discovered from `{modulesDir}/{moduleName}/models/`.
 * The migration label is derived from the module name.
 *
 * @param moduleName  - Name of the module (e.g. `"user"`)
 * @param modulesDir  - Path to the modules directory (default: `"src/modules"`)
 * @param options     - Generation options
 * @returns Result with path and diff information
 *
 * @example
 * ```typescript
 * const result = await createDiffMigration('user');
 *
 * if (result.hasChanges) {
 *   console.log(`Migration created: ${result.filePath}`);
 * } else {
 *   console.log('No changes detected');
 * }
 * ```
 */
export async function createDiffMigration(
  moduleName: string,
  moduleResolver: string,
  options: CreateDiffMigrationOptions = {},
  layout: DiffMigrationLayout = {},
): Promise<DiffMigrationResult> {
  if (!fs.existsSync(moduleResolver)) {
    throw new Error(`Module '${moduleName}' not found at ${moduleResolver}`);
  }

  const migrationsDir =
    layout.migrationsDir ?? path.join(moduleResolver, "migrations");

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  // Auto-discover model definitions from {modulesDir}/{moduleName}/models/
  const models = await discoverModels(moduleResolver);

  // Load previous snapshot from disk
  const previousSnapshot = loadSnapshot(migrationsDir, moduleName);

  // Build current snapshot from model definitions (pure — no I/O)
  const currentSnapshot = toModuleSchema(moduleName, models);

  // Compute the diff between the two snapshots
  const diff = diffSchemas.diffSchemas(previousSnapshot, currentSnapshot);

  // If no changes and not forcing, return early
  if (!diff.hasChanges && !options.force) {
    return {
      filePath: null,
      hasChanges: false,
      diff,
      migration: null,
      warnings: [],
    };
  }

  return writeDiffMigration({
    moduleName,
    migrationsDir,
    diff,
    currentSnapshot,
    options,
  });
}
