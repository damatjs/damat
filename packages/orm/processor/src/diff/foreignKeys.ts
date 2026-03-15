import type { ForeignKeySchema } from "@damatjs/orm-model/types";
import type {
  AddForeignKeyChange,
  DropForeignKeyChange,
  SchemaChange,
} from "../types/diff";
import { PRIORITY } from "./priority";
import { createNameMap, foreignKeysEqual } from "./utils";

/**
 * Diff foreign keys between two versions of a table.
 * A changed FK is handled as drop + re-add since PostgreSQL has no ALTER CONSTRAINT.
 */
export function diffForeignKeys(
  tableName: string,
  oldFKs: ForeignKeySchema[],
  newFKs: ForeignKeySchema[],
): SchemaChange[] {
  const changes: SchemaChange[] = [];

  const oldMap = createNameMap(oldFKs);
  const newMap = createNameMap(newFKs);

  // Added or changed
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

  // Removed
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
