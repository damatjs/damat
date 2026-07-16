import type { EnumSchema, ModuleSchema } from "@damatjs/orm-type";
import { toPascalCase } from "../naming";
import { enumZodSchema } from "./helpers";

export const generateNewZodSchema = (
  table: ModuleSchema["tables"][number],
  autoFields: Set<string>,
  allEnums: EnumSchema[],
): string[] => {
  const name = toPascalCase(table.name);
  const lines: string[] = [];

  for (const column of table.columns) {
    if (autoFields.has(column.name)) continue;
    if (["deleted_at", "created_at", "updated_at"].includes(column.name)) {
      continue;
    }
    const schema = enumZodSchema(column, allEnums);
    if (column.nullable) {
      lines.push(`  ${column.name}: ${schema}.nullable().optional(),`);
    } else if (column.default !== undefined) {
      lines.push(`  ${column.name}: ${schema}.optional(),`);
    } else {
      lines.push(`  ${column.name}: ${schema},`);
    }
  }

  return [
    `export const new${name}Schema = z.object({`,
    ...lines,
    `}).strict();`,
    ``,
    `export type New${name}Input = z.infer<typeof new${name}Schema>;`,
  ];
};
