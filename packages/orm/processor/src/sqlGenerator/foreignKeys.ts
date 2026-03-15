import type { ForeignKeySchema } from "@damatjs/orm-model/types";
import type {
  AddForeignKeyChange,
  DropForeignKeyChange,
  MigrationGeneratorOptions,
} from "../types";
import { quoteIdentifier, qualifiedTable, resolveSchema } from "./utils";

/**
 * Build ADD CONSTRAINT ... FOREIGN KEY SQL from a raw ForeignKeySchema.
 * Used by both table creation and the change-based add_foreign_key path.
 */
export function generateAddForeignKey(
  fk: ForeignKeySchema,
  tableName: string,
  schema: string,
): string {
  const fullTable = qualifiedTable(tableName, schema);
  const constraint = quoteIdentifier(fk.name);
  const cols = fk.columns.map(quoteIdentifier).join(", ");
  const refTable = quoteIdentifier(fk.referencedTable);
  const refCols = fk.referencedColumns.map(quoteIdentifier).join(", ");

  let sql = `ALTER TABLE ${fullTable} ADD CONSTRAINT ${constraint} FOREIGN KEY (${cols}) REFERENCES ${refTable} (${refCols})`;

  if (fk.onDelete) sql += ` ON DELETE ${fk.onDelete}`;
  if (fk.onUpdate) sql += ` ON UPDATE ${fk.onUpdate}`;
  if (fk.deferrable) {
    sql += " DEFERRABLE";
    if (fk.initiallyDeferred) sql += " INITIALLY DEFERRED";
  }
  if (fk.match === "FULL") sql += " MATCH FULL";

  return sql;
}

/**
 * Generate ADD CONSTRAINT SQL from an add_foreign_key change.
 */
export function generateAddForeignKeyFromChange(
  change: AddForeignKeyChange,
  options: MigrationGeneratorOptions,
): string {
  const schema = resolveSchema(options);
  return generateAddForeignKey(change.foreignKey, change.tableName, schema);
}

/**
 * Generate DROP CONSTRAINT SQL.
 */
export function generateDropForeignKey(
  change: DropForeignKeyChange,
  options: MigrationGeneratorOptions,
): string {
  const schema = resolveSchema(options);
  const fullTable = qualifiedTable(change.tableName, schema);
  const constraint = quoteIdentifier(change.constraintName);
  const ifExists = options.safeMode !== false ? " IF EXISTS" : "";
  return `ALTER TABLE ${fullTable} DROP CONSTRAINT${ifExists} ${constraint}`;
}
