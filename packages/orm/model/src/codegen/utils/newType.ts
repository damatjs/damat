import { ModuleSchema } from "@/types";
import { toPascalCase } from "@/utils/stringConvertor";
import { columnToTsType } from '../columnToTsType';

/**
 * Emit the `New*` insert type — all non-auto fields required, columns that
 * have a DB-level default become optional.
 *
 * ```ts
 * export type NewProduct = {
 *   title: string;
 *   status?: product_status;   // has a default
 *   category_id?: string | null;
 * };
 * ```
 */
export const generateNewType = (
  table: ModuleSchema["tables"][number],
  autoFields: Set<string>,
): string[] => {
  const name = toPascalCase(table.name);
  const lines: string[] = [];

  for (const col of table.columns) {
    if (autoFields.has(col.name)) continue;

    const tsType = columnToTsType(col);
    // Column is optional in New type if it has a default OR is nullable
    // (the DB / app layer will fill it in when omitted).
    const optional = col.default !== undefined || col.nullable;
    lines.push(`  ${col.name}${optional ? "?" : ""}: ${tsType};`);
  }

  return [`export type New${name} = {`, ...lines, `};`];
}
