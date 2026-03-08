/**
 * Utility Functions
 *
 * Helper functions for schema comparison.
 */

import type {
  ColumnSchema,
  EnumSchema,
  ForeignKeySchema,
  IndexSchema,
} from "../types";

/**
 * Create a map from an array of items keyed by name
 */
export function createNameMap<T extends { name: string }>(
  items: T[],
): Map<string, T> {
  return new Map(items.map((item) => [item.name, item]));
}

/**
 * Check if two columns are structurally equal
 */
export function columnsEqual(a: ColumnSchema, b: ColumnSchema): boolean {
  return (
    a.name === b.name &&
    a.type === b.type &&
    a.nullable === b.nullable &&
    a.primaryKey === b.primaryKey &&
    a.unique === b.unique &&
    a.length === b.length &&
    a.scale === b.scale &&
    a.default === b.default &&
    a.array === b.array &&
    JSON.stringify(a.enumValues) === JSON.stringify(b.enumValues)
  );
}

/**
 * Check if two indexes are structurally equal
 */
export function indexesEqual(a: IndexSchema, b: IndexSchema): boolean {
  return (
    a.name === b.name &&
    a.unique === b.unique &&
    JSON.stringify(a.columns) === JSON.stringify(b.columns) &&
    a.type === b.type &&
    a.where === b.where
  );
}

/**
 * Check if two foreign keys are structurally equal
 */
export function foreignKeysEqual(
  a: ForeignKeySchema,
  b: ForeignKeySchema,
): boolean {
  return (
    a.name === b.name &&
    JSON.stringify(a.columns) === JSON.stringify(b.columns) &&
    a.referencedTable === b.referencedTable &&
    JSON.stringify(a.referencedColumns) ===
      JSON.stringify(b.referencedColumns) &&
    a.onDelete === b.onDelete &&
    a.onUpdate === b.onUpdate
  );
}

/**
 * Check if two enums are structurally equal
 */
export function enumsEqual(a: EnumSchema, b: EnumSchema): boolean {
  return (
    a.name === b.name &&
    JSON.stringify(a.values.slice().sort()) ===
      JSON.stringify(b.values.slice().sort())
  );
}
