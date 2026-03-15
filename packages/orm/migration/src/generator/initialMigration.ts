/**
 * Initial Migration Creation
 *
 * Creates the first migration for a module — generates full CREATE TABLE SQL
 * from the current model definitions and saves an initial snapshot.
 */

import fs from "node:fs";
import path from "node:path";
import type {
  ModelDefinition,
  ModelProperties,
} from "@damatjs/orm-model/types";

import { log } from "../logger";
import { captureSnapshot, generateFromSnapshot } from "../snapshot";
import { getMigrationTemplateWithSQL } from "../utils/template";
import { generateTimestamp } from "../utils/timestamp";
import type { MigrationGeneratorOptions } from "../types";

/**
 * Create an initial migration that creates all tables for a module.
 * Useful for setting up a new module or creating a baseline migration.
 *
 * @param modulesDir - Path to the modules directory
 * @param moduleName - Name of the module
 * @param name - Human-readable label for the migration (e.g. "Initial")
 * @param models - Model definitions for the module
 * @param options - Generation options
 * @returns Path to the created migration file
 *
 * @example
 * ```typescript
 * const filePath = createInitialMigration(
 *   './src/modules',
 *   'user',
 *   'Initial',
 *   [UserModel, UserProfileModel],
 * );
 * ```
 */
export function createInitialMigration(
  modulesDir: string,
  moduleName: string,
  name: string,
  models: ModelDefinition<ModelProperties>[],
  options: MigrationGeneratorOptions = {},
): string {
  const moduleDir = path.join(modulesDir, moduleName);
  const migrationsDir = path.join(moduleDir, "migrations");

  if (!fs.existsSync(moduleDir)) {
    throw new Error(`Module '${moduleName}' not found at ${moduleDir}`);
  }

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  // Build snapshot from current models (pure — no I/O)
  // then immediately persist it and generate SQL from it
  const snapshot = captureSnapshot(migrationsDir, moduleName, models);

  // Generate full baseline SQL from the snapshot
  const migration = generateFromSnapshot(snapshot, options);

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
  log("success", `Created initial migration: ${moduleName}/${filename}`);

  if (migration.warnings.length > 0) {
    for (const warning of migration.warnings) {
      log("warn", warning);
    }
  }

  log("info", `Created schema snapshot for ${moduleName}`);

  return filePath;
}
