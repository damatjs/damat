/**
 * Schema Snapshot
 *
 * Utilities for saving and loading schema snapshots.
 */

import type { TableSchema } from "../types";

/**
 * Create a schema snapshot from table definitions
 * This can be used to save/load schema state for diffing
 */
export function createSchemaSnapshot(tables: TableSchema[]): string {
  return JSON.stringify(tables, null, 2);
}

/**
 * Load a schema snapshot from JSON
 */
export function loadSchemaSnapshot(json: string): TableSchema[] {
  return JSON.parse(json) as TableSchema[];
}
