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

import { log } from "../logger";
import { getMigrationTemplateWithSQL } from "../utils/template";
import { generateTimestamp } from "../utils/timestamp";
import {
  loadSnapshot,
  saveSnapshot,
  buildSnapshot,
  diffSnapshots,
  generateFromDiff,
} from "../snapshot";
import { discoverModels } from "../discovery";
import type { CreateDiffMigrationOptions, DiffMigrationResult } from "../types";

const DEFAULT_MODULES_DIR = "src/modules";

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
  modulesDir: string = DEFAULT_MODULES_DIR,
  options: CreateDiffMigrationOptions = {},
): Promise<DiffMigrationResult> {
  const moduleDir = path.join(modulesDir, moduleName);
  const migrationsDir = path.join(moduleDir, "migrations");

  if (!fs.existsSync(moduleDir)) {
    throw new Error(`Module '${moduleName}' not found at ${moduleDir}`);
  }

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  // Auto-discover model definitions from {modulesDir}/{moduleName}/models/
  const models = await discoverModels(modulesDir, moduleName);

  // Load previous snapshot from disk
  const previousSnapshot = loadSnapshot(migrationsDir);

  // Build current snapshot from model definitions (pure — no I/O)
  const currentSnapshot = buildSnapshot(moduleName, models);

  // Compute the diff between the two snapshots
  const diff = diffSnapshots(previousSnapshot, currentSnapshot);

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

  // Generate migration SQL from the diff
  const migration = generateFromDiff(
    diff,
    previousSnapshot,
    currentSnapshot,
    options,
  );

  // Use the capitalized module name as the migration label
  const now = new Date();
  const timestamp = generateTimestamp(now);
  const label = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
  const className = `Migration${timestamp}_${label}`;
  const filename = `${className}.ts`;
  const filePath = path.join(migrationsDir, filename);

  const template = getMigrationTemplateWithSQL(
    className,
    label,
    moduleName,
    now,
    migration,
  );

  fs.writeFileSync(filePath, template);
  log("success", `Created migration: ${moduleName}/${filename}`);

  // Update snapshot if requested (default: true)
  if (options.updateSnapshot !== false) {
    saveSnapshot(migrationsDir, currentSnapshot);
    log("info", `Updated schema snapshot for ${moduleName}`);
  }

  // Log warnings
  if (migration.warnings.length > 0) {
    for (const warning of migration.warnings) {
      log("warn", warning);
    }
  }

  return {
    filePath,
    hasChanges: diff.hasChanges,
    diff,
    migration,
    warnings: migration.warnings,
  };
}
