import type { IndexSchema } from "@damatjs/orm-model/types";
import type {
  AddIndexChange,
  DropIndexChange,
  MigrationGeneratorOptions,
} from "../types";
import { quoteIdentifier, qualifiedTable, resolveSchema } from "./utils";

/**
 * Build CREATE INDEX SQL from a raw IndexSchema (used by both table creation
 * and the change-based add_index path).
 */
export function generateCreateIndex(
  index: IndexSchema,
  tableName: string,
  schema: string,
  options: MigrationGeneratorOptions,
): string {
  const fullTable = qualifiedTable(tableName, schema);
  const indexName = quoteIdentifier(index.name);
  const cols = index.columns
    .map((c) => {
      const col = quoteIdentifier(c.name);
      return c.order ? `${col} ${c.order}` : col;
    })
    .join(", ");

  const unique = index.unique ? " UNIQUE" : "";
  const ifNotExists = options.safeMode !== false ? " IF NOT EXISTS" : "";
  const using =
    index.type && index.type !== "btree"
      ? ` USING ${index.type.toUpperCase()}`
      : "";
  const where = index.where ? ` WHERE ${index.where}` : "";

  return `CREATE${unique} INDEX${ifNotExists} ${indexName} ON ${fullTable}${using} (${cols})${where}`;
}

/**
 * Generate CREATE INDEX SQL from an add_index change.
 */
export function generateAddIndex(
  change: AddIndexChange,
  options: MigrationGeneratorOptions,
): string {
  const schema = resolveSchema(options);
  return generateCreateIndex(change.index, change.tableName, schema, options);
}

/**
 * Generate DROP INDEX SQL.
 * PostgreSQL indexes are schema-qualified independently of the table.
 */
export function generateDropIndex(
  change: DropIndexChange,
  options: MigrationGeneratorOptions,
): string {
  const schema = resolveSchema(options);
  const fullIndex = qualifiedTable(change.indexName, schema);
  const ifExists = options.safeMode !== false ? " IF EXISTS" : "";
  return `DROP INDEX${ifExists} ${fullIndex}`;
}
