import { IndexSchema, IndexDefinition } from "@/types";

/**
 * Convert user-friendly index definition to IndexSchema
 */
export function convertIndexDefinition(
  tableName: string,
  index: IndexDefinition,
  indexNumber: number,
): IndexSchema {
  const columns = index.on.map((col) => {
    if (typeof col === "string") {
      return { name: col };
    }
    const result: { name: string; order?: "ASC" | "DESC" } = { name: col.name };
    if (col.order !== undefined) {
      result.order = col.order;
    }
    return result;
  });

  const columnNames = columns.map((c) => c.name).join("_");
  const uniquePrefix = index.unique ? "uniq_" : "idx_";
  const generatedName = `${uniquePrefix}${tableName}_${columnNames}_${indexNumber}`;

  const schema: IndexSchema = {
    name: index.name ?? generatedName,
    columns,
    unique: index.unique ?? false,
  };

  if (index.type !== undefined) {
    schema.type = index.type;
  }
  if (index.where !== undefined) {
    schema.where = index.where;
  }

  return schema;
}
