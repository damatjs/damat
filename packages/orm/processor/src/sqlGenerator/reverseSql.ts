import type {
  AlterColumnChange,
  SchemaChange,
  MigrationGeneratorOptions,
} from "../types";
import { generateDropTable } from "./tables";
import {
  generateDropColumn,
  generateAlterColumn,
  generateRenameColumn,
} from "./columns";
import { generateDropIndex } from "./indexes";
import { generateDropForeignKey } from "./foreignKeys";
import { generateDropEnum } from "./enums";

/**
 * Generate the reverse (DOWN) SQL for a single change.
 *
 * Operations that cannot be reversed without the original definition emit an
 * explanatory SQL comment instead of silently producing nothing.
 */
export function generateReverseChangeSQL(
  change: SchemaChange,
  options: MigrationGeneratorOptions,
): string[] {
  switch (change.type) {
    case "create_table":
      return [
        generateDropTable(
          {
            type: "drop_table",
            tableName: change.table.name,
            cascade: true,
            priority: 0,
          },
          options,
        ),
      ];

    case "drop_table":
      return [
        `-- Cannot automatically reverse DROP TABLE "${change.tableName}"`,
      ];

    case "rename_table":
      return [
        `-- Cannot automatically reverse RENAME TABLE "${change.fromName}" → "${change.toName}"`,
      ];

    case "add_column":
      return [
        generateDropColumn(
          {
            type: "drop_column",
            tableName: change.tableName,
            columnName: change.column.name,
            priority: 0,
          },
          options,
        ),
      ];

    case "drop_column":
      return [
        `-- Cannot automatically reverse DROP COLUMN "${change.columnName}" on "${change.tableName}"`,
      ];

    case "alter_column": {
      const rev: AlterColumnChange["changes"] = {};
      const { changes } = change;
      if (changes.type)
        rev.type = { from: changes.type.to, to: changes.type.from };
      if (changes.nullable)
        rev.nullable = { from: changes.nullable.to, to: changes.nullable.from };
      if (changes.default)
        rev.default = { from: changes.default.to, to: changes.default.from };
      if (changes.length)
        rev.length = { from: changes.length.to, to: changes.length.from };
      if (changes.scale)
        rev.scale = { from: changes.scale.to, to: changes.scale.from };
      if (changes.unique)
        rev.unique = { from: changes.unique.to, to: changes.unique.from };
      if (changes.array)
        rev.array = { from: changes.array.to, to: changes.array.from };
      return generateAlterColumn({ ...change, changes: rev }, options);
    }

    case "rename_column":
      return [
        generateRenameColumn(
          { ...change, fromName: change.toName, toName: change.fromName },
          options,
        ),
      ];

    case "add_index":
      return [
        generateDropIndex(
          {
            type: "drop_index",
            tableName: change.tableName,
            indexName: change.index.name,
            priority: 0,
          },
          options,
        ),
      ];

    case "drop_index":
      return [
        `-- Cannot automatically reverse DROP INDEX "${change.indexName}"`,
      ];

    case "add_foreign_key":
      return [
        generateDropForeignKey(
          {
            type: "drop_foreign_key",
            tableName: change.tableName,
            constraintName: change.foreignKey.name,
            priority: 0,
          },
          options,
        ),
      ];

    case "drop_foreign_key":
      return [
        `-- Cannot automatically reverse DROP CONSTRAINT "${change.constraintName}"`,
      ];

    case "create_enum":
      return [
        generateDropEnum(
          { type: "drop_enum", enumName: change.enumDef.name, priority: 0 },
          options,
        ),
      ];

    case "drop_enum":
      return [`-- Cannot automatically reverse DROP TYPE "${change.enumName}"`];

    case "alter_enum":
      if (change.addValues?.length) {
        return [
          `-- Cannot automatically reverse ALTER TYPE "${change.enumName}" (added values cannot be removed in PostgreSQL)`,
        ];
      }
      return [];
  }
}
