import type { ModuleSchema } from "@damatjs/orm-type";
import { DEFAULT_AUTO_FIELDS } from "@/defaults";
import { generationLogger, type GenerationLogger } from "@/logger";
import { toEnumTypeName } from "@/render/naming";
import {
  generateIdZodSchema,
  generateNewZodSchema,
  generateParamsZodSchema,
  generateQueryZodSchema,
  generateUpdateZodSchema,
} from "@/render/zod";

/**
 * Generate a Zod schema file for a single table.
 *
 * Produces:
 * - `new{Table}Schema` - Schema for creating new records
 * - `update{Table}Schema` - Schema for partial updates
 * - `{table}QuerySchema` - Schema for query parameters
 * - `{table}IdSchema` - Schema for record IDs
 * - `{Table}ParamsSchema` - Schema for the `[id]` route path params
 *
 * ```ts
 * import { z } from "@damatjs/deps/zod";
 *
 * export const newUserSchema = z.object({
 *   email: z.string(),
 *   name: z.string().min(1),
 * }).strict();
 *
 * export type NewUserInput = z.infer<typeof newUserSchema>;
 * ```
 */
export function generateZodFile(
  table: ModuleSchema["tables"][number],
  schema: ModuleSchema,
  banner: string | null,
  loggerData?: GenerationLogger,
): string {
  const logger = generationLogger(loggerData);
  logger.debug("generateZodFile started", {
    tableName: table.name,
    columnCount: table.columns.length,
  });

  const allEnums = schema.enums ?? [];
  const autoFields = new Set(DEFAULT_AUTO_FIELDS);

  const sections: string[][] = [];

  // Import z from deps
  sections.push([`import { z } from "@damatjs/deps/zod";`]);

  // Import enum types if needed
  const tableEnums = allEnums.filter((e) =>
    table.columns.some((c) => c.type === "enum" && c.enum === e.name),
  );

  if (tableEnums.length > 0) {
    const enumNames = tableEnums.map((e) => toEnumTypeName(e.name)).join(", ");
    sections.push([`import type { ${enumNames} } from "./enums";`]);
  }

  // Generate schemas
  sections.push(generateNewZodSchema(table, autoFields, allEnums));
  sections.push(generateUpdateZodSchema(table, allEnums));
  sections.push(generateQueryZodSchema(table, allEnums));
  sections.push(generateIdZodSchema(table));
  sections.push(generateParamsZodSchema(table));

  const body = sections
    .filter((s) => s.length > 0)
    .map((s) => s.join("\n"))
    .join("\n\n");

  logger.debug("generateZodFile completed", {
    tableName: table.name,
    hasEnums: tableEnums.length > 0,
  });

  return banner ? `${banner}\n${body}\n` : `${body}\n`;
}
