import type { TableSchema } from "@damatjs/orm-model/types";
import type {
  CreateTableChange,
  DropTableChange,
  RenameTableChange,
  MigrationGeneratorOptions,
} from "../types";
import {
  quoteIdentifier,
  qualifiedTable,
  resolveSchema,
  columnDefinitionSql,
} from "./utils";
import { generateCreateIndex } from "./indexes";
import { generateAddForeignKey } from "./foreignKeys";

/**
 * Generate CREATE TABLE SQL plus its associated indexes and foreign keys.
 */
export function generateCreateTable(
  change: CreateTableChange,
  options: MigrationGeneratorOptions,
): string[] {
  const { table } = change;
  const schema = resolveSchema(options, table.schema);
  const fullName = qualifiedTable(table.name, schema);
  const statements: string[] = [];

  // Column definitions
  const colDefs = table.columns.map(columnDefinitionSql);

  // Inline PRIMARY KEY constraint when composite
  if (table.primaryKey.columns.length > 1) {
    const pkCols = table.primaryKey.columns.map(quoteIdentifier).join(", ");
    colDefs.push(
      `CONSTRAINT ${quoteIdentifier(table.primaryKey.name)} PRIMARY KEY (${pkCols})`,
    );
  }

  const ifNotExists = options.safeMode !== false ? " IF NOT EXISTS" : "";
  statements.push(
    `CREATE TABLE${ifNotExists} ${fullName} (\n  ${colDefs.join(",\n  ")}\n)`,
  );

  // Indexes (skip any that duplicate the primary key)
  const pkCols = new Set(table.primaryKey.columns);
  for (const index of table.indexes) {
    const isRedundantPk =
      index.columns.length === pkCols.size &&
      index.columns.every((c) => pkCols.has(c.name));
    if (!isRedundantPk) {
      statements.push(generateCreateIndex(index, table.name, schema, options));
    }
  }

  // Foreign keys
  for (const fk of table.foreignKeys) {
    statements.push(generateAddForeignKey(fk, table.name, schema));
  }

  return statements;
}

/**
 * Generate DROP TABLE SQL.
 */
export function generateDropTable(
  change: DropTableChange,
  options: MigrationGeneratorOptions,
): string {
  const schema = resolveSchema(options);
  const fullName = qualifiedTable(change.tableName, schema);
  const ifExists = options.safeMode !== false ? " IF EXISTS" : "";
  const cascade = change.cascade || options.cascadeDrops ? " CASCADE" : "";
  return `DROP TABLE${ifExists} ${fullName}${cascade}`;
}

/**
 * Generate ALTER TABLE ... RENAME TO SQL.
 */
export function generateRenameTable(
  change: RenameTableChange,
  options: MigrationGeneratorOptions,
): string {
  const schema = resolveSchema(options);
  return `ALTER TABLE ${qualifiedTable(change.fromName, schema)} RENAME TO ${quoteIdentifier(change.toName)}`;
}

/**
 * Generate all SQL to recreate a table from its schema alone (no change context).
 * Used by the snapshot-based generator.
 */
export function generateTableSql(
  table: TableSchema,
  options: MigrationGeneratorOptions,
): string[] {
  return generateCreateTable(
    { type: "create_table", tableName: table.name, table, priority: 0 },
    options,
  );
}
