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
import { generateMigration } from "@damatjs/orm-processor";
import { saveSnapshot, toModuleSchema } from "@damatjs/orm-model";
import { getMigrationTemplateWithSQL } from "../utils/template";
import { generateTimestamp } from "../utils/timestamp";
import { discoverModels } from "../discovery";
import type { MigrationGeneratorOptions } from "@damatjs/orm-processor";

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
 * // → src/modules/user/migrations/Migration20260316103000_Initial.sql
 * ```
 */
export async function createInitialMigration(
  moduleName: string,
  moduleResolver: string,
  options: MigrationGeneratorOptions = {},
): Promise<string> {

  if (!fs.existsSync(moduleResolver)) {
    throw new Error(`Module '${moduleName}' not found at ${moduleResolver}`);
  }

  const migrationsDir = path.join(moduleResolver, "migrations");

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  // Auto-discover model definitions from {modulesDir}/{moduleName}/models/
  const models = await discoverModels(moduleResolver);

  // Build snapshot from models then persist it
  const snapshot = toModuleSchema(moduleName, models);
  saveSnapshot(migrationsDir, snapshot);

  // Generate full baseline SQL from the snapshot
  const migration = generateMigration.generateFromSnapshot(snapshot, options);

  // Use "Initial" as the migration label
  const now = new Date();
  const timestamp = generateTimestamp(now);
  const label = "Initial";
  const className = `Migration${timestamp}_${label}`;
  const filename = `${className}.sql`;
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
