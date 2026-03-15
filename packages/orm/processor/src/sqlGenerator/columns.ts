import type {
  AddColumnChange,
  AlterColumnChange,
  DropColumnChange,
  RenameColumnChange,
  MigrationGeneratorOptions,
} from "../types";
import {
  quoteIdentifier,
  qualifiedTable,
  resolveSchema,
  columnDefinitionSql,
} from "./utils";

/**
 * Generate ALTER TABLE ... ADD COLUMN SQL.
 */
export function generateAddColumn(
  change: AddColumnChange,
  options: MigrationGeneratorOptions,
): string {
  const schema = resolveSchema(options);
  return `ALTER TABLE ${qualifiedTable(change.tableName, schema)} ADD COLUMN ${columnDefinitionSql(change.column)}`;
}

/**
 * Generate ALTER TABLE ... DROP COLUMN SQL.
 */
export function generateDropColumn(
  change: DropColumnChange,
  options: MigrationGeneratorOptions,
): string {
  const schema = resolveSchema(options);
  const fullTable = qualifiedTable(change.tableName, schema);
  const col = quoteIdentifier(change.columnName);
  const ifExists = options.safeMode !== false ? " IF EXISTS" : "";
  const cascade = options.cascadeDrops ? " CASCADE" : "";
  return `ALTER TABLE ${fullTable} DROP COLUMN${ifExists} ${col}${cascade}`;
}

/**
 * Generate one or more ALTER TABLE ... ALTER COLUMN statements.
 * Each sub-change (type, nullable, default, length/scale) is a separate statement
 * because PostgreSQL requires them to be issued individually.
 */
export function generateAlterColumn(
  change: AlterColumnChange,
  options: MigrationGeneratorOptions,
): string[] {
  const schema = resolveSchema(options);
  const fullTable = qualifiedTable(change.tableName, schema);
  const col = quoteIdentifier(change.columnName);
  const stmts: string[] = [];

  const { changes } = change;

  if (changes.type) {
    const newType = changes.type.to.toUpperCase();
    stmts.push(
      `ALTER TABLE ${fullTable} ALTER COLUMN ${col} TYPE ${newType} USING ${col}::${newType}`,
    );
  }

  if (changes.length && !changes.type) {
    // varchar length change without a full type swap
    const len = changes.length.to;
    if (len != null) {
      stmts.push(
        `ALTER TABLE ${fullTable} ALTER COLUMN ${col} TYPE VARCHAR(${len})`,
      );
    }
  }

  if (changes.nullable) {
    stmts.push(
      changes.nullable.to
        ? `ALTER TABLE ${fullTable} ALTER COLUMN ${col} DROP NOT NULL`
        : `ALTER TABLE ${fullTable} ALTER COLUMN ${col} SET NOT NULL`,
    );
  }

  if (changes.default !== undefined) {
    stmts.push(
      changes.default.to != null
        ? `ALTER TABLE ${fullTable} ALTER COLUMN ${col} SET DEFAULT ${changes.default.to}`
        : `ALTER TABLE ${fullTable} ALTER COLUMN ${col} DROP DEFAULT`,
    );
  }

  if (changes.unique) {
    if (changes.unique.to) {
      stmts.push(`ALTER TABLE ${fullTable} ADD UNIQUE (${col})`);
    } else {
      // Dropping a unique constraint requires the constraint name — emit a comment
      stmts.push(
        `-- ALTER TABLE ${fullTable} DROP CONSTRAINT <unique_constraint_name_for_${change.columnName}>`,
      );
    }
  }

  return stmts;
}

/**
 * Generate ALTER TABLE ... RENAME COLUMN SQL.
 */
export function generateRenameColumn(
  change: RenameColumnChange,
  options: MigrationGeneratorOptions,
): string {
  const schema = resolveSchema(options);
  return `ALTER TABLE ${qualifiedTable(change.tableName, schema)} RENAME COLUMN ${quoteIdentifier(change.fromName)} TO ${quoteIdentifier(change.toName)}`;
}
