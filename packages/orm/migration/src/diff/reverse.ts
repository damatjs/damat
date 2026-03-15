/**
 * Reverse Diff
 *
 * Generate the inverse diff for down migrations.
 */

import type {
  AlterColumnChange,
  AlterEnumChange,
  DropColumnChange,
  DropEnumChange,
  DropForeignKeyChange,
  DropIndexChange,
  DropTableChange,
  SchemaDiff,
  SchemaChange,
} from "../types";
import { PRIORITY } from "./priority";

/**
 * Generate the inverse diff (for down migrations)
 *
 * @param diff - Forward schema diff
 * @returns Reversed schema diff
 */
export function reverseDiff(diff: SchemaDiff): SchemaDiff {
  const reversedChanges: SchemaChange[] = [];

  for (const change of diff.changes) {
    switch (change.type) {
      case "create_table":
        reversedChanges.push({
          type: "drop_table",
          tableName: change.table.name,
          cascade: true,
          priority: PRIORITY.DROP_TABLE,
        } as DropTableChange);
        break;

      case "drop_table":
        // Can't reverse a drop without the original table definition
        // This should be handled by storing the original schema
        break;

      case "add_column":
        reversedChanges.push({
          type: "drop_column",
          tableName: change.tableName,
          columnName: change.column.name,
          priority: PRIORITY.DROP_COLUMN,
        } as DropColumnChange);
        break;

      case "drop_column":
        // Can't reverse without original column definition
        break;

      case "alter_column":
        // Reverse the alterations
        const reversedColumnChanges: AlterColumnChange["changes"] = {};
        if (change.changes.type) {
          reversedColumnChanges.type = {
            from: change.changes.type.to,
            to: change.changes.type.from,
          };
        }
        if (change.changes.nullable) {
          reversedColumnChanges.nullable = {
            from: change.changes.nullable.to,
            to: change.changes.nullable.from,
          };
        }
        if (change.changes.default) {
          reversedColumnChanges.default = {
            from: change.changes.default.to,
            to: change.changes.default.from,
          };
        }
        if (change.changes.length) {
          reversedColumnChanges.length = {
            from: change.changes.length.to,
            to: change.changes.length.from,
          };
        }
        reversedChanges.push({
          type: "alter_column",
          tableName: change.tableName,
          columnName: change.columnName,
          changes: reversedColumnChanges,
          priority: PRIORITY.ALTER_COLUMN,
        } as AlterColumnChange);
        break;

      case "add_index":
        reversedChanges.push({
          type: "drop_index",
          tableName: change.tableName,
          indexName: change.index.name,
          priority: PRIORITY.DROP_INDEX,
        } as DropIndexChange);
        break;

      case "drop_index":
        // Can't reverse without original index definition
        break;

      case "add_foreign_key":
        reversedChanges.push({
          type: "drop_foreign_key",
          tableName: change.tableName,
          constraintName: change.foreignKey.name,
          priority: PRIORITY.DROP_FOREIGN_KEY,
        } as DropForeignKeyChange);
        break;

      case "drop_foreign_key":
        // Can't reverse without original FK definition
        break;

      case "create_enum":
        reversedChanges.push({
          type: "drop_enum",
          enumName: change.enumDef.name,
          priority: PRIORITY.DROP_ENUM,
        } as DropEnumChange);
        break;

      case "drop_enum":
        // Can't reverse without original enum definition
        break;

      case "alter_enum":
        // Swap add/remove values
        reversedChanges.push({
          type: "alter_enum",
          enumName: change.enumName,
          addValues: change.removeValues,
          removeValues: change.addValues,
          priority: PRIORITY.ALTER_ENUM,
        } as AlterEnumChange);
        break;
    }
  }

  // Reverse the order for down migration
  reversedChanges.reverse();

  return {
    hasChanges: reversedChanges.length > 0,
    changes: reversedChanges,
    warnings: [],
  };
}
