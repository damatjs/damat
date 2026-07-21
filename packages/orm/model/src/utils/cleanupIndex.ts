import { IndexColumn, IndexSchema } from "@/types";

/**
 * Convert user-friendly index definition to IndexSchema
 */
export function cleanupIndexSchema(
  tableName: string,
  index: IndexSchema,
  indexNumber?: number,
): IndexSchema {
  const columns = index.columns.map((col) => {
    if (typeof col === "string") {
      return { name: col };
    }
    const result: IndexColumn = { name: col.name };
    if (col.order !== undefined) {
      result.order = col.order;
    }
    return result;
  });

  const columnNames = columns.map((c) => c.name).join("_");
  const uniquePrefix = index.unique ? "uniq_" : "idx_";
  let generatedName = `${uniquePrefix}${tableName}_${columnNames}`;
  if (indexNumber) generatedName = `${generatedName}_${indexNumber}`;

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
