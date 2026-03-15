/**
 * Diff-Based Migration Creation
 *
 * Creates migrations based on the difference between current model definitions
 * and the previous schema snapshot.
 */

import fs from "node:fs";
import path from "node:path";
import type {
  ModelDefinition,
  ModelProperties,
} from "@damatjs/orm-model/types";

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
import type { CreateDiffMigrationOptions, DiffMigrationResult } from "../types";

/**
 * Create a migration based on the difference between current model definitions
 * and the previous schema snapshot.
 *
 * @param modulesDir - Path to the modules directory
 * @param moduleName - Name of the module
 * @param name - Human-readable label for the migration (e.g. "AddPhoneColumn")
 * @param models - Current model definitions for the module
 * @param options - Generation options
 * @returns Result with path and diff information
 *
 * @example
 * ```typescript
 * const result = createDiffMigration(
 *   './src/modules',
 *   'user',
 *   'AddPhoneColumn',
 *   [UserModel, UserProfileModel],
 * );
 *
 * if (result.hasChanges) {
 *   console.log(`Migration created: ${result.filePath}`);
 * } else {
 *   console.log('No changes detected');
 * }
 * ```
 */
export function createDiffMigration(
  modulesDir: string,
  moduleName: string,
  name: string,
  models: ModelDefinition<ModelProperties>[],
  options: CreateDiffMigrationOptions = {},
): DiffMigrationResult {
  const moduleDir = path.join(modulesDir, moduleName);
  const migrationsDir = path.join(moduleDir, "migrations");

  if (!fs.existsSync(moduleDir)) {
    throw new Error(`Module '${moduleName}' not found at ${moduleDir}`);
  }

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

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

  // Build migration file
  const now = new Date();
  const timestamp = generateTimestamp(now);
  const className = `Migration${timestamp}_${name}`;
  const filename = `${className}.ts`;
  const filePath = path.join(migrationsDir, filename);

  const template = getMigrationTemplateWithSQL(
    className,
    name,
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
