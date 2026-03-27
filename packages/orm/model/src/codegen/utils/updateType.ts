import { ModuleSchema } from "@/types";
import { toPascalCase } from "@/utils/stringConvertor";


/**
 * Emit the `Update*` partial update type — all non-PK columns optional.
 *
 * ```ts
 * export type UpdateProduct = Partial<Omit<Product, 'id'>>;
 * ```
 */
export const generateUpdateType = (table: ModuleSchema["tables"][number]): string[] => {
  const name = toPascalCase(table.name);
  const pkCols = table.columns
    .filter((c) => c.primaryKey)
    .map((c) => `'${c.name}'`);

  if (pkCols.length === 0) {
    return [`export type Update${name} = Partial<${name}>;`];
  }

  const omit = pkCols.length === 1 ? pkCols[0] : pkCols.join(" | ");

  return [`export type Update${name} = Partial<Omit<${name}, ${omit}>>;`];
}
