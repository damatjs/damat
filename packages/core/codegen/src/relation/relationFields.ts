import { toPascalCase } from "@/utils/stringConvertor";
import { RelationSchema } from "@damatjs/orm-type";

/**
 * For a given table's `RelationSchema[]`, produce the optional loaded-relation
 * fields to append to the row interface.
 *
 * - `belongsTo`  → `target?: TargetType`    (singular loaded entity)
 * - `hasMany`    → `targets?: TargetType[]`  (loaded collection, pluralised)
 * - `hasOne`     → `target?: TargetType`     (singular loaded entity)
 *
 * Field name derivation:
 *   - Uses `rel.from` (the property name in the model definition).
 *   - `belongsTo` — strip `_id` from the first `linkedBy` FK column if available.
 *   - `hasMany` / `hasOne` — directly uses `rel.from`.
 */
export const relationFields = (relations: RelationSchema[]): string[] => {
  return relations.map((rel) => {
    const targetType = toPascalCase(rel.to);

    let fieldName: string;
    if (rel.type === "belongsTo") {
      // For belongsTo, prefer stripping _id from FK column for backward compat
      // Fall back to the "from" property name
      const fkCol = rel.linkedBy?.[0];
      fieldName = fkCol ? fkCol.replace(/_id$/, "") : rel.from;
    } else {
      // For hasMany / hasOne, use the "from" property name directly
      fieldName = rel.from;
    }

    const tsType = rel.type === "hasMany" ? `${targetType}[]` : targetType;

    return `  ${fieldName}?: ${tsType};`;
  });
};
