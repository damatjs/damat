/**
 * Schema Diff
 *
 * Compare two schemas (tables and enums) and generate a diff.
 */

import type {
  EnumSchema,
  SchemaDiff,
  SchemaChange,
  TableSchema,
} from "../types";
import { createNameMap } from "./utils";
import { diffTable } from "./tables";
import { diffEnums } from "./enums";

/**
 * Compare two table schemas and generate a diff
 *
 * @param oldTables - Previous schema state (empty array for new tables)
 * @param newTables - Current/desired schema state
 * @returns Schema diff with changes and warnings
 */
export function diffTables(
  oldTables: TableSchema[],
  newTables: TableSchema[],
): SchemaDiff {
  const allChanges: SchemaChange[] = [];
  const allWarnings: string[] = [];

  const oldMap = createNameMap(oldTables);
  const newMap = createNameMap(newTables);

  // Get all table names
  const allTableNames = new Set([...oldMap.keys(), ...newMap.keys()]);

  // Diff each table
  for (const tableName of allTableNames) {
    const { changes, warnings } = diffTable(
      oldMap.get(tableName),
      newMap.get(tableName),
    );
    allChanges.push(...changes);
    allWarnings.push(...warnings);
  }

  // Sort changes by priority
  allChanges.sort((a, b) => a.priority - b.priority);

  return {
    hasChanges: allChanges.length > 0,
    changes: allChanges,
    warnings: allWarnings,
  };
}

/**
 * Compare two full module schemas (tables + enums)
 *
 * @param oldTables - Previous tables
 * @param newTables - New tables
 * @param oldEnums - Previous enums
 * @param newEnums - New enums
 * @returns Complete schema diff
 */
export function diffSchemas(
  oldTables: TableSchema[],
  newTables: TableSchema[],
  oldEnums: EnumSchema[] = [],
  newEnums: EnumSchema[] = [],
): SchemaDiff {
  // Diff tables
  const tableDiff = diffTables(oldTables, newTables);

  // Diff enums
  const { changes: enumChanges, warnings: enumWarnings } = diffEnums(
    oldEnums,
    newEnums,
  );

  // Merge and sort all changes
  const allChanges = [...enumChanges, ...tableDiff.changes];
  allChanges.sort((a, b) => a.priority - b.priority);

  return {
    hasChanges: allChanges.length > 0,
    changes: allChanges,
    warnings: [...enumWarnings, ...tableDiff.warnings],
  };
}
