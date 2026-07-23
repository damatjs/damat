import { toPascalCase } from "@/render/naming";
import type { RelationSchema } from "@damatjs/orm-type";

/**
 * For a given table's `RelationSchema[]`, produce the optional loaded-relation
 * fields to append to the row interface.
 *
 * - `belongsTo`  → `target?: TargetType`    (singular loaded entity)
 * - `hasMany`    → `targets?: TargetType[]`  (loaded collection, pluralised)
 * - `hasOne`     → `target?: TargetType`     (singular loaded entity)
 *
 * Field name derivation:
 *   - `belongsTo` — strip `_id` from the first `linkedBy` FK column if available.
 *     Use `rel.from` when that derived name is already a concrete column.
 *   - `hasMany` / `hasOne` — directly uses `rel.from`.
 */
export const relationFields = (
  relations: RelationSchema[],
  columnNames: readonly string[] = [],
): string[] => {
  const columns = new Set(columnNames);
  return relations.map((rel) => {
    const targetType = toPascalCase(rel.to);

    let fieldName: string;
    if (rel.type === "belongsTo") {
      // For belongsTo, prefer stripping _id from FK column for backward compat
      // Fall back to the "from" property name
      const fkCol = rel.linkedBy?.[0];
      const derived = fkCol ? fkCol.replace(/_id$/, "") : rel.from;
      fieldName = columns.has(derived) ? rel.from : derived;
    } else {
      // For hasMany / hasOne, use the "from" property name directly
      fieldName = rel.from;
    }

    const tsType = rel.type === "hasMany" ? `${targetType}[]` : targetType;

    return `  ${fieldName}?: ${tsType};`;
  });
};
