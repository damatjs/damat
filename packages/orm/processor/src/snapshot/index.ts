import { ModuleSchema } from '@damatjs/orm-type';
import fs from "node:fs";
import path from "node:path";

/**
 * Load a ModuleSchema from disk.
 *
 * @param migrationsDir  Absolute path to the module's migrations directory
 * @returns The parsed schema, or an empty baseline schema if no snapshot file exists.
 */
export function loadSnapshot(
  migrationsDir: string,
  moduleName: string,
): ModuleSchema {
  const snapshotPath = path.join(migrationsDir, "schema-snapshot.json");

  if (!fs.existsSync(snapshotPath)) {
    return {
      moduleName,
      schema: "public",
      tables: [],
      enums: [],
      relationships: [],
    };
  }

  const raw = fs.readFileSync(snapshotPath, "utf-8");
  return JSON.parse(raw) as ModuleSchema;
}

/**
 * Save a ModuleSchema to disk.
 *
 * @param migrationsDir  Absolute path to the module's migrations directory
 * @param schema         The schema state to persist
 */
export function saveSnapshot(
  migrationsDir: string,
  schema: ModuleSchema,
): void {
  const snapshotPath = path.join(migrationsDir, "schema-snapshot.json");

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  const output = JSON.stringify(schema, null, 2);
  fs.writeFileSync(snapshotPath, output);
}

/**
 * Check if a schema snapshot file exists in the specified migrations directory.
 *
 * @param migrationsDir Absolute path to the module's migrations directory
 */
export function snapshotExist(migrationsDir: string): boolean {
  const snapshotPath = path.join(migrationsDir, "schema-snapshot.json");
  return fs.existsSync(snapshotPath);
}
