import type { ColumnSchema } from "@damatjs/orm-model/types";
import type {
  AddColumnChange,
  AlterColumnChange,
  DropColumnChange,
  SchemaChange,
} from "../types/diff";
import { PRIORITY } from "./priority";
import { createNameMap, columnsEqual } from "./utils";

/**
 * Diff columns between two versions of a table.
 */
export function diffColumns(
  tableName: string,
  oldColumns: ColumnSchema[],
  newColumns: ColumnSchema[],
): SchemaChange[] {
  const changes: SchemaChange[] = [];

  const oldMap = createNameMap(oldColumns);
  const newMap = createNameMap(newColumns);

  // Added
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

  // Removed
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

  // Altered
  for (const [name, newCol] of newMap) {
    const oldCol = oldMap.get(name);
    if (!oldCol || columnsEqual(oldCol, newCol)) continue;

    const columnChanges: AlterColumnChange["changes"] = {};

    if (oldCol.type !== newCol.type)
      columnChanges.type = { from: oldCol.type, to: newCol.type };
    if (oldCol.nullable !== newCol.nullable)
      columnChanges.nullable = { from: oldCol.nullable, to: newCol.nullable };
    if (oldCol.default !== newCol.default)
      columnChanges.default = { from: oldCol.default, to: newCol.default };
    if (oldCol.length !== newCol.length)
      columnChanges.length = { from: oldCol.length, to: newCol.length };
    if (oldCol.scale !== newCol.scale)
      columnChanges.scale = { from: oldCol.scale, to: newCol.scale };
    if (oldCol.unique !== newCol.unique)
      columnChanges.unique = { from: oldCol.unique, to: newCol.unique };
    if (oldCol.array !== newCol.array)
      columnChanges.array = { from: !!oldCol.array, to: !!newCol.array };

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

  return changes;
}
