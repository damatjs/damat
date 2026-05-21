import { EnumSchema, ModuleSchema } from "@damatjs/orm-type";
import { toEnumTypeName } from './stringConvertor';

/**
 * Emit all enum type aliases for the module, e.g.:
 *
 * ```ts
 * export type ProductStatusEnum = 'draft' | 'active' | 'archived';
 * ```
 *
 * Used by `generateTypes()` (single-file mode) to emit all enums at the top.
 */
export const generateEnumTypes = (schema: ModuleSchema): string[] => {
  if (!schema.enums || schema.enums.length === 0) return [];

  return schema.enums.map((e) => {
    const union = e.values.map((v) => `'${v}'`).join(" | ");
    return `export type ${toEnumTypeName(e.name)} = ${union};`;
  });
};

/**
 * Emit the full contents of a standalone `enums.ts` file for the module.
 * Returns `null` when the module has no enums (no file should be written).
 *
 * ```ts
 * export type ProductStatusEnum = 'draft' | 'active' | 'archived';
 * export type OrdersEnum = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
 * ```
 */
export const generateEnumsFile = (
  schema: ModuleSchema,
  banner: string | null,
): string | null => {
  if (!schema.enums || schema.enums.length === 0) return null;

  const lines = schema.enums.map((e) => {
    const union = e.values.map((v) => `'${v}'`).join(" | ");
    return `export type ${toEnumTypeName(e.name)} = ${union};`;
  });

  const body = lines.join("\n");
  return banner ? `${banner}\n${body}\n` : `${body}\n`;
};

/**
 * Return the subset of `allEnums` that are actually referenced by columns of
 * the given table.  Used to determine which enum names to import per table.
 */
export const getTableEnums = (
  table: ModuleSchema["tables"][number],
  allEnums: EnumSchema[],
): EnumSchema[] => {
  const enumNames = new Set(
    table.columns
      .filter((col) => col.type === "enum" && col.enum)
      .map((col) => col.enum as string),
  );
  return allEnums.filter((e) => enumNames.has(e.name));
};
