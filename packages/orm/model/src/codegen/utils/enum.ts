import { ModuleSchema } from "@/types";

/**
 * Emit all enum type aliases for the module, e.g.:
 *
 * ```ts
 * export type product_status = 'draft' | 'active' | 'archived';
 * ```
 */
export const generateEnumTypes = (schema: ModuleSchema): string[] => {
  if (!schema.enums || schema.enums.length === 0) return [];

  return schema.enums.map((e) => {
    const union = e.values.map((v) => `'${v}'`).join(" | ");
    return `export type ${e.name} = ${union};`;
  });
}