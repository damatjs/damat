import type {
  ColumnSchema,
  ForeignKeySchema,
  IndexSchema,
} from "@damatjs/orm-model/types";
import type { NativeEnum } from "../types/snapshot";

/**
 * Build a lookup map keyed by `name` from any array of named items.
 */
export function createNameMap<T extends { name: string }>(
  items: T[],
): Map<string, T> {
  return new Map(items.map((item) => [item.name, item]));
}

/**
 * Check if two columns are structurally equal.
 */
export function columnsEqual(a: ColumnSchema, b: ColumnSchema): boolean {
  return (
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
 * Check if two indexes are structurally equal.
 */
export function indexesEqual(a: IndexSchema, b: IndexSchema): boolean {
  return (
    a.unique === b.unique &&
    a.type === b.type &&
    a.where === b.where &&
    JSON.stringify(a.columns) === JSON.stringify(b.columns)
  );
}

/**
 * Check if two foreign keys are structurally equal.
 */
export function foreignKeysEqual(
  a: ForeignKeySchema,
  b: ForeignKeySchema,
): boolean {
  return (
    a.referencedTable === b.referencedTable &&
    a.onDelete === b.onDelete &&
    a.onUpdate === b.onUpdate &&
    a.deferrable === b.deferrable &&
    a.match === b.match &&
    JSON.stringify(a.columns) === JSON.stringify(b.columns) &&
    JSON.stringify(a.referencedColumns) === JSON.stringify(b.referencedColumns)
  );
}

/**
 * Check if two native enums are structurally equal (order-insensitive).
 */
export function nativeEnumsEqual(a: NativeEnum, b: NativeEnum): boolean {
  return (
    a.schema === b.schema &&
    JSON.stringify(a.values.slice().sort()) ===
      JSON.stringify(b.values.slice().sort())
  );
}
