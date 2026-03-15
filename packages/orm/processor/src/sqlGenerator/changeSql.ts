import type { SchemaChange, MigrationGeneratorOptions } from "../types";
import {
  generateCreateTable,
  generateDropTable,
  generateRenameTable,
} from "./tables";
import {
  generateAddColumn,
  generateDropColumn,
  generateAlterColumn,
  generateRenameColumn,
} from "./columns";
import { generateAddIndex, generateDropIndex } from "./indexes";
import {
  generateAddForeignKeyFromChange,
  generateDropForeignKey,
} from "./foreignKeys";
import {
  generateCreateEnum,
  generateDropEnum,
  generateAlterEnum,
} from "./enums";
import type { SchemaDiff } from "../types";

/**
 * Dispatch a single SchemaChange to the appropriate SQL generator.
 * Returns one or more SQL statements.
 */
export function generateChangeSQL(
  change: SchemaChange,
  options: MigrationGeneratorOptions,
): string[] {
  switch (change.type) {
    case "create_table":
      return generateCreateTable(change, options);
    case "drop_table":
      return [generateDropTable(change, options)];
    case "rename_table":
      return [generateRenameTable(change, options)];
    case "add_column":
      return [generateAddColumn(change, options)];
    case "drop_column":
      return [generateDropColumn(change, options)];
    case "alter_column":
      return generateAlterColumn(change, options);
    case "rename_column":
      return [generateRenameColumn(change, options)];
    case "add_index":
      return [generateAddIndex(change, options)];
    case "drop_index":
      return [generateDropIndex(change, options)];
    case "add_foreign_key":
      return [generateAddForeignKeyFromChange(change, options)];
    case "drop_foreign_key":
      return [generateDropForeignKey(change, options)];
    case "create_enum":
      return [generateCreateEnum(change, options)];
    case "drop_enum":
      return [generateDropEnum(change, options)];
    case "alter_enum":
      return generateAlterEnum(change, options);
  }
}

/**
 * Build a human-readable summary of what a diff contains.
 */
export function generateDescription(diff: SchemaDiff): string {
  const counts: Partial<Record<SchemaChange["type"], number>> = {};

  for (const change of diff.changes) {
    counts[change.type] = (counts[change.type] ?? 0) + 1;
  }

  const label = (n: number | undefined, singular: string, plural: string) =>
    n ? `${n} ${n === 1 ? singular : plural}` : null;

  const parts = [
    label(counts.create_table, "table created", "tables created"),
    label(counts.drop_table, "table dropped", "tables dropped"),
    label(counts.rename_table, "table renamed", "tables renamed"),
    label(counts.add_column, "column added", "columns added"),
    label(counts.drop_column, "column dropped", "columns dropped"),
    label(counts.alter_column, "column altered", "columns altered"),
    label(counts.rename_column, "column renamed", "columns renamed"),
    label(counts.add_index, "index added", "indexes added"),
    label(counts.drop_index, "index dropped", "indexes dropped"),
    label(counts.add_foreign_key, "foreign key added", "foreign keys added"),
    label(
      counts.drop_foreign_key,
      "foreign key dropped",
      "foreign keys dropped",
    ),
    label(counts.create_enum, "enum created", "enums created"),
    label(counts.drop_enum, "enum dropped", "enums dropped"),
    label(counts.alter_enum, "enum altered", "enums altered"),
  ].filter(Boolean);

  return parts.join(", ") || "No changes";
}
