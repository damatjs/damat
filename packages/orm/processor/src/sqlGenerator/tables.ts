import type { TableSchema } from "@damatjs/orm-type";
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

/**
 * Result of table SQL generation with FKs separated.
 * This allows callers to defer FK creation until after all tables exist.
 */
export interface TableSqlResult {
  /** CREATE TABLE and CREATE INDEX statements */
  tableStatements: string[];
  /** ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY statements (deprecated: always empty now) */
  foreignKeyStatements: string[];
}

/**
 * Generate CREATE TABLE SQL plus its associated indexes.
 * Foreign keys are returned separately so they can be deferred.
 *
 * Note: When using change-based generation (via SchemaChange), indexes and FKs
 * are emitted as separate changes, so this function only generates the CREATE TABLE
 * statement for those cases.
 */
export function generateCreateTable(
  change: CreateTableChange,
  options: MigrationGeneratorOptions,
): TableSqlResult {
  const { table } = change;
  const schema = resolveSchema(options);
  const fullName = qualifiedTable(table.name, schema);
  const tableStatements: string[] = [];
  const foreignKeyStatements: string[] = [];

  const pkColumns = table.columns
    .filter((c) => c.primaryKey)
    .map((c) => c.name);
  const isCompositePk = pkColumns.length > 1;

  // Column definitions
  const colDefs = table.columns.map((c) =>
    columnDefinitionSql(c, isCompositePk),
  );

  // Inline PRIMARY KEY constraint when composite
  if (isCompositePk) {
    const pkCols = pkColumns.map(quoteIdentifier).join(", ");
    colDefs.push(
      `CONSTRAINT ${quoteIdentifier(`${table.name}_pkey`)} PRIMARY KEY (${pkCols})`,
    );
  }

  const ifNotExists = options.safeMode !== false ? " IF NOT EXISTS" : "";
  tableStatements.push(
    `CREATE TABLE${ifNotExists} ${fullName} (\n  ${colDefs.join(",\n  ")}\n)`,
  );

  // Note: Indexes and FKs are NOT generated here when using change-based generation.
  // They are emitted as separate add_index and add_foreign_key changes.
  // However, for backward compatibility with generateTableSql direct calls,
  // we still check if we should include them inline.
  //
  // The diff system and snapshot generator both emit separate changes for indexes/FKs.

  return { tableStatements, foreignKeyStatements };
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
 * Returns FKs separately so they can be deferred until all tables exist.
 */
export function generateTableSql(
  table: Omit<TableSchema, "relations">,
  options: MigrationGeneratorOptions,
): TableSqlResult {
  return generateCreateTable(
    { type: "create_table", tableName: table.name, table, priority: 0 },
    options,
  );
}
