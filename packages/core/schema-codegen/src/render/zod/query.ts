import type { EnumSchema, ModuleSchema } from "@damatjs/orm-type";
import { toCamelCase, toPascalCase } from "../naming";
import { enumZodSchema } from "./helpers";

export const generateQueryZodSchema = (
  table: ModuleSchema["tables"][number],
  allEnums: EnumSchema[],
): string[] => {
  const name = toPascalCase(table.name);
  const lines: string[] = [];

  for (const column of table.columns) {
    let schema = enumZodSchema(column, allEnums);
    if (
      ["integer", "smallint", "serial", "smallserial"].includes(column.type)
    ) {
      schema = "z.coerce.number().int()";
    } else if (column.type === "bigint" || column.type === "bigserial") {
      schema = "z.coerce.bigint()";
    } else if (column.type === "boolean") {
      schema = "z.coerce.boolean()";
    }
    const optional = column.nullable
      ? `${schema}.nullable().optional()`
      : `${schema}.optional()`;
    lines.push(`  ${column.name}: ${optional},`);
  }

  lines.push(`  limit: z.coerce.number().int().positive().optional(),`);
  lines.push(`  offset: z.coerce.number().int().min(0).optional(),`);
  lines.push(`  orderBy: z.string().optional(),`);
  lines.push(`  orderDir: z.enum(['asc', 'desc']).optional(),`);

  return [
    `export const ${toCamelCase(name)}QuerySchema = z.object({`,
    ...lines,
    `}).strict();`,
    ``,
    `export type ${name}Query = z.infer<typeof ${toCamelCase(name)}QuerySchema>;`,
  ];
};
