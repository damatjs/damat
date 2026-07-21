import type { EnumSchema, ModuleSchema } from "@damatjs/orm-type";
import { toPascalCase } from "../naming";
import { enumZodSchema } from "./helpers";

export const generateUpdateZodSchema = (
  table: ModuleSchema["tables"][number],
  allEnums: EnumSchema[],
): string[] => {
  const name = toPascalCase(table.name);
  const lines: string[] = [];

  for (const column of table.columns) {
    if (column.primaryKey) continue;
    if (
      ["deleted_at", "created_at", "updated_at", "id"].includes(column.name)
    ) {
      continue;
    }
    const schema = enumZodSchema(column, allEnums);
    const optional = column.nullable
      ? `${schema}.nullable().optional()`
      : `${schema}.optional()`;
    lines.push(`  ${column.name}: ${optional},`);
  }

  return [
    `export const update${name}Schema = z.object({`,
    ...lines,
    `}).strict();`,
    ``,
    `export type Update${name}Input = z.infer<typeof update${name}Schema>;`,
  ];
};
