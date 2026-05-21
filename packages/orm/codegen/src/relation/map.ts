import { RelationSchema } from "@damatjs/orm-type";

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
