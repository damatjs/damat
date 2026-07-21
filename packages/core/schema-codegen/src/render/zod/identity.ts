import type { ModuleSchema } from "@damatjs/orm-type";
import { toCamelCase, toPascalCase } from "../naming";
import { primaryKeyZodSchema } from "./helpers";

export const generateIdZodSchema = (
  table: ModuleSchema["tables"][number],
): string[] => {
  const name = toPascalCase(table.name);
  const primaryKey = table.columns.find((column) => column.primaryKey);
  if (!primaryKey) return [];
  const schema = primaryKeyZodSchema(primaryKey);
  return [
    `export const ${toCamelCase(name)}IdSchema = ${schema};`,
    ``,
    `export type ${name}Id = z.infer<typeof ${toCamelCase(name)}IdSchema>;`,
  ];
};

export const generateParamsZodSchema = (
  table: ModuleSchema["tables"][number],
): string[] => {
  const name = toPascalCase(table.name);
  const primaryKey = table.columns.find((column) => column.primaryKey);
  if (!primaryKey) return [];
  const schema = primaryKeyZodSchema(primaryKey);
  return [
    `export const ${name}ParamsSchema = z.object({`,
    `  id: ${schema},`,
    `}).strict();`,
    ``,
    `export type ${name}Params = z.infer<typeof ${name}ParamsSchema>;`,
  ];
};
