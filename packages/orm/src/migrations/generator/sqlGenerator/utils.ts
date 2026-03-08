/**
 * SQL Utilities
 *
 * Helper functions for generating SQL statements.
 */

import type { ColumnSchema } from "../types";

/**
 * Quote an identifier (table name, column name, etc.)
 */
export function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * Get the full column type definition including length/precision
 */
export function getColumnTypeSql(column: ColumnSchema): string {
  let typeSql = column.type.toUpperCase();

  // Handle varchar with length
  if (column.type === "varchar" && column.length) {
    typeSql = `VARCHAR(${column.length})`;
  }

  // Handle numeric with precision/scale
  if (
    (column.type === "numeric" || column.type === "decimal") &&
    column.length
  ) {
    if (column.scale) {
      typeSql = `NUMERIC(${column.length}, ${column.scale})`;
    } else {
      typeSql = `NUMERIC(${column.length})`;
    }
  }

  // Handle array types
  if (column.array) {
    typeSql = `${typeSql}[]`;
  }

  // Handle enum types
  if (column.type === "enum" && column.enumName) {
    typeSql = quoteIdentifier(column.enumName);
  }

  return typeSql;
}

/**
 * Get the default value clause for a column
 */
export function getDefaultClause(column: ColumnSchema): string {
  if (column.default === undefined) {
    return "";
  }
  return ` DEFAULT ${column.default}`;
}

/**
 * Get the nullable constraint
 */
export function getNullableClause(column: ColumnSchema): string {
  return column.nullable ? " NULL" : " NOT NULL";
}

/**
 * Generate a single column definition for CREATE TABLE
 */
export function generateColumnDefinition(column: ColumnSchema): string {
  const parts = [quoteIdentifier(column.name), getColumnTypeSql(column)];

  if (column.primaryKey) {
    parts.push("PRIMARY KEY");
  } else {
    parts.push(getNullableClause(column));
  }

  if (column.unique && !column.primaryKey) {
    parts.push("UNIQUE");
  }

  parts.push(getDefaultClause(column).trim());

  return parts.filter(Boolean).join(" ");
}
