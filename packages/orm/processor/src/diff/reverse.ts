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
} from "../types/diff";
import { PRIORITY } from "./priority";

/**
 * Produce the inverse of a forward diff for use in down migrations.
 *
 * Operations that cannot be reversed without the original definition
 * (drop_table, drop_column, drop_index, drop_foreign_key, drop_enum)
 * are intentionally skipped — the caller must handle those by storing
 * the previous snapshot and re-generating from it.
 */
export function reverseDiff(diff: SchemaDiff): SchemaDiff {
  const reversed: SchemaChange[] = [];

  for (const change of diff.changes) {
    switch (change.type) {
      case "create_table":
        reversed.push({
          type: "drop_table",
          tableName: change.table.name,
          cascade: true,
          priority: PRIORITY.DROP_TABLE,
        } as DropTableChange);
        break;

      case "add_column":
        reversed.push({
          type: "drop_column",
          tableName: change.tableName,
          columnName: change.column.name,
          priority: PRIORITY.DROP_COLUMN,
        } as DropColumnChange);
        break;

      case "alter_column": {
        const rev: AlterColumnChange["changes"] = {};
        if (change.changes.type)
          rev.type = {
            from: change.changes.type.to,
            to: change.changes.type.from,
          };
        if (change.changes.nullable)
          rev.nullable = {
            from: change.changes.nullable.to,
            to: change.changes.nullable.from,
          };
        if (change.changes.default)
          rev.default = {
            from: change.changes.default.to,
            to: change.changes.default.from,
          };
        if (change.changes.length)
          rev.length = {
            from: change.changes.length.to,
            to: change.changes.length.from,
          };
        if (change.changes.scale)
          rev.scale = {
            from: change.changes.scale.to,
            to: change.changes.scale.from,
          };
        if (change.changes.unique)
          rev.unique = {
            from: change.changes.unique.to,
            to: change.changes.unique.from,
          };
        if (change.changes.array)
          rev.array = {
            from: change.changes.array.to,
            to: change.changes.array.from,
          };
        reversed.push({
          type: "alter_column",
          tableName: change.tableName,
          columnName: change.columnName,
          changes: rev,
          priority: PRIORITY.ALTER_COLUMN,
        } as AlterColumnChange);
        break;
      }

      case "add_index":
        reversed.push({
          type: "drop_index",
          tableName: change.tableName,
          indexName: change.index.name,
          priority: PRIORITY.DROP_INDEX,
        } as DropIndexChange);
        break;

      case "add_foreign_key":
        reversed.push({
          type: "drop_foreign_key",
          tableName: change.tableName,
          constraintName: change.foreignKey.name,
          priority: PRIORITY.DROP_FOREIGN_KEY,
        } as DropForeignKeyChange);
        break;

      case "create_enum":
        reversed.push({
          type: "drop_enum",
          enumName: change.enumDef.name,
          priority: PRIORITY.DROP_ENUM,
        } as DropEnumChange);
        break;

      case "alter_enum":
        reversed.push({
          type: "alter_enum",
          enumName: change.enumName,
          addValues: change.removeValues,
          removeValues: change.addValues,
          priority: PRIORITY.ALTER_ENUM,
        } as AlterEnumChange);
        break;

      // drop_* cannot be reversed without the original definition — skip
      case "drop_table":
      case "drop_column":
      case "drop_index":
      case "drop_foreign_key":
      case "drop_enum":
      case "rename_table":
      case "rename_column":
        break;
    }
  }

  reversed.reverse();

  return {
    hasChanges: reversed.length > 0,
    changes: reversed,
    warnings: [],
  };
}
