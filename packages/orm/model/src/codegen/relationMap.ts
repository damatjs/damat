import { RelationSchema } from "@/types";
import { toPascalCase, toCamelCase } from "@/utils/stringConvertor";

// ─── Relation helpers ─────────────────────────────────────────────────────────

/**
 * Build a map of  tableName → RelationSchema[]  for quick look-up.
 * Only relations that originate from a given table are grouped together.
 */
export const buildRelationMap = (
  relationships: RelationSchema[],
): Map<string, RelationSchema[]> => {
  const map = new Map<string, RelationSchema[]>();
  for (const rel of relationships) {
    const list = map.get(rel.from) ?? [];
    list.push(rel);
    map.set(rel.from, list);
  }
  return map;
}

/**
 * For a given table's `RelationSchema[]`, produce the optional loaded-relation
 * fields to append to the row interface.
 *
 * - `belongsTo`  → `target?: TargetType`    (singular loaded entity)
 * - `hasMany`    → `targets?: TargetType[]`  (loaded collection, pluralised)
 * - `hasOne`     → `target?: TargetType`     (singular loaded entity)
 *
 * Field name derivation (since `from` in RelationSchema is the source table
 * name, not the property name):
 *   - `belongsTo` — strip `_id` from the first `linkedBy` FK column, e.g.
 *                   `category_id` → `category`.
 *   - `hasMany`   — camelCase of the target table name, pluralised with an
 *                   `s` suffix, e.g. `order` → `orders`.
 *   - `hasOne`    — camelCase of the target table name, e.g. `profile`.
 */
export const relationFields = (relations: RelationSchema[]): string[] => {
  return relations.map((rel) => {
    const targetType = toPascalCase(rel.to);

    let fieldName: string;
    if (rel.type === "belongsTo") {
      const fkCol = rel.linkedBy?.[0];
      fieldName = fkCol ? fkCol.replace(/_id$/, "") : toCamelCase(rel.to);
    } else if (rel.type === "hasMany") {
      // Pluralise: append 's' unless the name already ends in 's'
      const base = toCamelCase(rel.to);
      fieldName = base.endsWith("s") ? base : `${base}s`;
    } else {
      fieldName = toCamelCase(rel.to);
    }

    const tsType = rel.type === "hasMany" ? `${targetType}[]` : targetType;

    return `  ${fieldName}?: ${tsType};`;
  });
}
