import type { ModuleSchema, RelationSchema } from "@damatjs/orm-type";
import { columnToTsType } from "../columnToTsType";
import { relationFields } from "../relation";
import { toPascalCase } from "./naming";

/**
 * Emit the row interface for a table, e.g.:
 *
 * ```ts
 * export interface Product {
 *   id: string;
 *   title: string;
 *   status: product_status;
 *   category_id: string | null;
 *   // loaded relations (optional)
 *   category?: Category;
 *   orderItems?: OrderItem[];
 * }
 * ```
 */
export const generateRowInterface = (
  table: ModuleSchema["tables"][number],
  relations: RelationSchema[],
): string[] => {
  const name = toPascalCase(table.name);
  const lines: string[] = [];

  // Columns
  for (const col of table.columns) {
    lines.push(`  ${col.name}: ${columnToTsType(col)};`);
  }

  // Loaded relation fields (optional)
  const relLines = relationFields(
    relations,
    table.columns.map(({ name }) => name),
  );
  if (relLines.length > 0) {
    lines.push(`  // loaded relations`);
    lines.push(...relLines);
  }

  return [`export interface ${name} {`, ...lines, `}`];
};
