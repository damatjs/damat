/**
 * Foreign Key Diff
 *
 * Compare foreign keys between two tables and detect changes.
 */

import type {
  AddForeignKeyChange,
  DropForeignKeyChange,
  ForeignKeySchema,
  SchemaChange,
} from "../types";
import { PRIORITY } from "./priority";
import { createNameMap, foreignKeysEqual } from "./utils";

/**
 * Diff foreign keys between two tables
 */
export function diffForeignKeys(
  tableName: string,
  oldFKs: ForeignKeySchema[],
  newFKs: ForeignKeySchema[],
): SchemaChange[] {
  const changes: SchemaChange[] = [];

  const oldMap = createNameMap(oldFKs);
  const newMap = createNameMap(newFKs);

  // Find added foreign keys
  for (const [name, newFK] of newMap) {
    const oldFK = oldMap.get(name);
    if (!oldFK) {
      changes.push({
        type: "add_foreign_key",
        tableName,
        foreignKey: newFK,
        priority: PRIORITY.ADD_FOREIGN_KEY,
      } as AddForeignKeyChange);
    } else if (!foreignKeysEqual(oldFK, newFK)) {
      // Foreign key changed - drop and recreate
      changes.push({
        type: "drop_foreign_key",
        tableName,
        constraintName: name,
        priority: PRIORITY.DROP_FOREIGN_KEY,
      } as DropForeignKeyChange);
      changes.push({
        type: "add_foreign_key",
        tableName,
        foreignKey: newFK,
        priority: PRIORITY.ADD_FOREIGN_KEY,
      } as AddForeignKeyChange);
    }
  }

  // Find removed foreign keys
  for (const [name] of oldMap) {
    if (!newMap.has(name)) {
      changes.push({
        type: "drop_foreign_key",
        tableName,
        constraintName: name,
        priority: PRIORITY.DROP_FOREIGN_KEY,
      } as DropForeignKeyChange);
    }
  }

  return changes;
}
