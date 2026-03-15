/**
 * Initial Migration Creation
 *
 * Creates the first migration for a module — auto-discovers model definitions
 * from {modulesDir}/{moduleName}/models/, generates full CREATE TABLE SQL,
 * and saves an initial snapshot.
 */

import fs from "node:fs";
import path from "node:path";

import { log } from "../logger";
import { captureSnapshot, generateFromSnapshot } from "../snapshot";
import { getMigrationTemplateWithSQL } from "../utils/template";
import { generateTimestamp } from "../utils/timestamp";
import { discoverModels } from "../discovery";
import type { MigrationGeneratorOptions } from "../types";

const DEFAULT_MODULES_DIR = "src/modules";

/**
 * Create an initial migration that creates all tables for a module.
 *
 * Models are auto-discovered from `{modulesDir}/{moduleName}/models/`.
 *
 * @param moduleName  - Name of the module (e.g. `"user"`)
 * @param modulesDir  - Path to the modules directory (default: `"src/modules"`)
 * @param options     - Generation options
 * @returns Absolute path to the created migration file
 *
 * @example
 * ```typescript
 * const filePath = await createInitialMigration('user');
 * // → src/modules/user/migrations/Migration20260316103000_Initial.ts
 * ```
 */
export async function createInitialMigration(
  moduleName: string,
  modulesDir: string = DEFAULT_MODULES_DIR,
  options: MigrationGeneratorOptions = {},
): Promise<string> {
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

  // Build snapshot from models then persist it
  const snapshot = captureSnapshot(migrationsDir, moduleName, models);

  // Generate full baseline SQL from the snapshot
  const migration = generateFromSnapshot(snapshot, options);

  // Use "Initial" as the migration label
  const now = new Date();
  const timestamp = generateTimestamp(now);
  const label = "Initial";
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
  log("success", `Created initial migration: ${moduleName}/${filename}`);

  if (migration.warnings.length > 0) {
    for (const warning of migration.warnings) {
      log("warn", warning);
    }
  }

  log("info", `Saved schema snapshot for ${moduleName}`);

  return filePath;
}
