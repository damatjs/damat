import type { ColumnSchema } from "@damatjs/orm-model/types";

/**
 * Wrap a SQL identifier in double-quotes, escaping any embedded quotes.
 */
export function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * Produce the qualified `"schema"."table"` identifier string.
 */
export function qualifiedTable(tableName: string, schema: string): string {
  return `${quoteIdentifier(schema)}.${quoteIdentifier(tableName)}`;
}

/**
 * Resolve the effective schema: explicit option > table-level schema > "public".
 */
export function resolveSchema(
  options: { schema?: string },
  tableSchema?: string,
): string {
  return options.schema ?? tableSchema ?? "public";
}

/**
 * Build the SQL type fragment for a column, including length, precision/scale,
 * array suffix, and named enum resolution.
 */
export function columnTypeSql(col: ColumnSchema): string {
  // Named enum — reference the type directly
  if (col.type === "enum" && col.enumName) {
    const base = quoteIdentifier(col.enumName);
    return col.array ? `${base}[]` : base;
  }

  let sql: string;

  switch (col.type) {
    case "varchar":
      sql = col.length ? `VARCHAR(${col.length})` : "VARCHAR";
      break;
    case "decimal":
    case "numeric":
      sql =
        col.length != null
          ? col.scale != null
            ? `NUMERIC(${col.length}, ${col.scale})`
            : `NUMERIC(${col.length})`
          : "NUMERIC";
      break;
    default:
      sql = col.type.toUpperCase();
  }

  return col.array ? `${sql}[]` : sql;
}

/**
 * Build the complete inline column definition for use inside CREATE TABLE.
 *
 *   "col_name" VARCHAR(128) NOT NULL UNIQUE DEFAULT 'x'
 */
export function columnDefinitionSql(col: ColumnSchema): string {
  const parts: string[] = [quoteIdentifier(col.name), columnTypeSql(col)];

  if (col.primaryKey) {
    parts.push("PRIMARY KEY");
  } else {
    parts.push(col.nullable ? "NULL" : "NOT NULL");
    if (col.unique) parts.push("UNIQUE");
  }

  if (col.default !== undefined) parts.push(`DEFAULT ${col.default}`);

  return parts.join(" ");
}
