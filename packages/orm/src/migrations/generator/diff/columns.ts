/**
 * Column Diff
 *
 * Compare columns between two tables and detect changes.
 */

import type {
  AddColumnChange,
  AlterColumnChange,
  ColumnSchema,
  DropColumnChange,
  SchemaChange,
} from "../types";
import { PRIORITY } from "./priority";
import { createNameMap, columnsEqual } from "./utils";

/**
 * Diff columns between two tables
 */
export function diffColumns(
  tableName: string,
  oldColumns: ColumnSchema[],
  newColumns: ColumnSchema[],
): SchemaChange[] {
  const changes: SchemaChange[] = [];

  const oldMap = createNameMap(oldColumns);
  const newMap = createNameMap(newColumns);

  // Find added columns
  for (const [name, newCol] of newMap) {
    if (!oldMap.has(name)) {
      changes.push({
        type: "add_column",
        tableName,
        column: newCol,
        priority: PRIORITY.ADD_COLUMN,
      } as AddColumnChange);
    }
  }

  // Find removed columns
  for (const [name] of oldMap) {
    if (!newMap.has(name)) {
      changes.push({
        type: "drop_column",
        tableName,
        columnName: name,
        priority: PRIORITY.DROP_COLUMN,
      } as DropColumnChange);
    }
  }

  // Find altered columns
  for (const [name, newCol] of newMap) {
    const oldCol = oldMap.get(name);
    if (oldCol && !columnsEqual(oldCol, newCol)) {
      const columnChanges: AlterColumnChange["changes"] = {};

      if (oldCol.type !== newCol.type) {
        columnChanges.type = { from: oldCol.type, to: newCol.type };
      }
      if (oldCol.nullable !== newCol.nullable) {
        columnChanges.nullable = { from: oldCol.nullable, to: newCol.nullable };
      }
      if (oldCol.default !== newCol.default) {
        columnChanges.default = { from: oldCol.default, to: newCol.default };
      }
      if (oldCol.length !== newCol.length) {
        columnChanges.length = { from: oldCol.length, to: newCol.length };
      }

      if (Object.keys(columnChanges).length > 0) {
        changes.push({
          type: "alter_column",
          tableName,
          columnName: name,
          changes: columnChanges,
          priority: PRIORITY.ALTER_COLUMN,
        } as AlterColumnChange);
      }
    }
  }

  return changes;
}
