/**
 * Type Mapping
 *
 * Utilities for mapping MikroORM types to PostgreSQL types.
 */

import type { ColumnType, EnumSchema } from "../types";

/**
 * Map MikroORM property types to PostgreSQL column types
 */
export function mapPropertyType(prop: Record<string, unknown>): ColumnType {
  const type = (prop.type as string)?.toLowerCase() ?? "text";
  const columnTypes = prop.columnTypes as string[] | undefined;
  const columnType = columnTypes?.[0]?.toLowerCase();

  // Use explicit column type if available
  if (columnType) {
    if (columnType.includes("uuid")) return "uuid";
    if (columnType.includes("timestamptz")) return "timestamptz";
    if (columnType.includes("timestamp")) return "timestamp";
    if (columnType.includes("varchar")) return "varchar";
    if (columnType.includes("text")) return "text";
    if (columnType.includes("int8") || columnType.includes("bigint"))
      return "bigint";
    if (columnType.includes("int4") || columnType.includes("integer"))
      return "integer";
    if (columnType.includes("int2") || columnType.includes("smallint"))
      return "smallint";
    if (columnType.includes("bool")) return "boolean";
    if (columnType.includes("jsonb")) return "jsonb";
    if (columnType.includes("json")) return "json";
    if (columnType.includes("numeric") || columnType.includes("decimal"))
      return "numeric";
    if (columnType.includes("float8") || columnType.includes("double"))
      return "double precision";
    if (columnType.includes("float4") || columnType.includes("real"))
      return "real";
    if (columnType.includes("bytea")) return "bytea";
    if (columnType.includes("date")) return "date";
    if (columnType.includes("time")) return "time";
    return columnType;
  }

  // Map from TypeScript/MikroORM types
  switch (type) {
    case "string":
    case "String":
      return prop.length ? "varchar" : "text";
    case "number":
    case "Number":
      return "integer";
    case "bigint":
    case "BigInt":
      return "bigint";
    case "boolean":
    case "Boolean":
      return "boolean";
    case "date":
    case "Date":
      return "timestamptz";
    case "object":
    case "Object":
    case "json":
      return "jsonb";
    case "uuid":
      return "uuid";
    case "text":
      return "text";
    default:
      // Check if it's an enum
      if (prop.enum) {
        return "enum";
      }
      return "text";
  }
}

/**
 * Extract enum information from a property
 */
export function extractEnum(prop: Record<string, unknown>): EnumSchema | null {
  if (!prop.enum || !prop.items) {
    return null;
  }

  // Generate enum name based on column types
  const columnTypes = prop.columnTypes as string[] | undefined;
  const enumName = columnTypes?.[0] || `${prop.name as string}_enum`;

  return {
    name: enumName,
    values: prop.items as string[],
  };
}

/**
 * Get the default value expression for a column
 */
export function getDefaultValue(
  prop: Record<string, unknown>,
): string | undefined {
  if (prop.default === undefined) {
    return undefined;
  }

  const def = prop.default;

  // Handle function defaults
  if (typeof def === "function") {
    return undefined; // Can't represent function defaults in SQL
  }

  // Handle string defaults
  if (typeof def === "string") {
    // Check if it's already a SQL expression
    if (
      def.includes("(") ||
      def.toLowerCase() === "now()" ||
      def.toLowerCase() === "current_timestamp" ||
      def.toLowerCase().startsWith("gen_random")
    ) {
      return def;
    }
    return `'${def}'`;
  }

  // Handle boolean defaults
  if (typeof def === "boolean") {
    return def ? "true" : "false";
  }

  // Handle numeric defaults
  if (typeof def === "number") {
    return String(def);
  }

  return undefined;
}

/**
 * Check if property represents a relation reference type
 */
export function isRelation(prop: Record<string, unknown>): string | null {
  // MikroORM uses 'kind' or 'reference' depending on version
  const ref = (prop.kind as string) || (prop.reference as string);
  if (ref === "m:1" || ref === "1:1" || ref === "1:m" || ref === "m:n") {
    return ref;
  }
  return null;
}
