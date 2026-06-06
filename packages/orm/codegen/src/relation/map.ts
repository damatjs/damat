import { RelationSchema } from "@damatjs/orm-type";

/**
 * Build a map of tableName → RelationSchema[] for quick look-up.
 * Groups relations by the table they originate from.
 */
export const buildRelationMap = (
  relationships: RelationSchema[],
): Map<string, RelationSchema[]> => {
  const map = new Map<string, RelationSchema[]>();
  for (const rel of relationships) {
    const list = map.get(rel.fromTable) ?? [];
    list.push(rel);
    map.set(rel.fromTable, list);
  }
  return map;
};
