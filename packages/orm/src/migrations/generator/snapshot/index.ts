/**
 * Schema Snapshot Management
 *
 * Functions for loading and saving schema snapshots that track
 * the state of database schemas between migrations.
 */

import fs from "node:fs";
import path from "node:path";

import type { TableSchema, EnumSchema } from "../types";

export const SNAPSHOT_FILENAME = ".schema-snapshot.json";

/**
 * Get the path to the schema snapshot file for a module
 */
export function getSnapshotPath(migrationsDir: string): string {
  return path.join(migrationsDir, SNAPSHOT_FILENAME);
}

/**
 * Load the previous schema snapshot for a module
 */
export function loadPreviousSchema(migrationsDir: string): {
  tables: TableSchema[];
  enums: EnumSchema[];
} {
  const snapshotPath = getSnapshotPath(migrationsDir);

  if (!fs.existsSync(snapshotPath)) {
    return { tables: [], enums: [] };
  }

  try {
    const content = fs.readFileSync(snapshotPath, "utf-8");
    const snapshot = JSON.parse(content);
    return {
      tables: snapshot.tables || [],
      enums: snapshot.enums || [],
    };
  } catch {
    return { tables: [], enums: [] };
  }
}

/**
 * Save the current schema as a snapshot
 */
export function saveSchemaSnapshot(
  migrationsDir: string,
  tables: TableSchema[],
  enums: EnumSchema[],
): void {
  const snapshotPath = getSnapshotPath(migrationsDir);
  const snapshot = { tables, enums, updatedAt: new Date().toISOString() };
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
}
