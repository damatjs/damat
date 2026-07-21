import type { ModuleSchema } from "@damatjs/orm-type";
import { DEFAULT_AUTO_FIELDS } from "@/defaults";
import { generationLogger, type GenerationLogger } from "@/logger";
import {
  generateIdZodSchema,
  generateNewZodSchema,
  generateParamsZodSchema,
  generateQueryZodSchema,
  generateUpdateZodSchema,
} from "@/render/zod";
import type { GenerateTypesOptions } from "@/types";

export function generateZodTypes(
  schema: ModuleSchema,
  options: GenerateTypesOptions = {},
  loggerData?: GenerationLogger,
): string {
  const logger = generationLogger(loggerData);
  logger.info("generateZodTypes started", {
    moduleName: schema.moduleName,
    tableCount: schema.tables.length,
    hasEnums: (schema.enums ?? []).length > 0,
  });
  const autoFields = new Set([
    ...DEFAULT_AUTO_FIELDS,
    ...(options.autoFields ?? []),
  ]);
  const banner =
    options.banner === false
      ? null
      : (options.banner ??
        "// This file is auto-generated. Do not edit it manually.\n" +
          "// Re-generate by running: bun run codegen\n");
  const allEnums = schema.enums ?? [];
  const sections: string[][] = [[`import { z } from "@damatjs/deps/zod";`]];

  for (const table of schema.tables) {
    sections.push(generateNewZodSchema(table, autoFields, allEnums));
    sections.push(generateUpdateZodSchema(table, allEnums));
    sections.push(generateQueryZodSchema(table, allEnums));
    sections.push(generateIdZodSchema(table));
    sections.push(generateParamsZodSchema(table));
  }
  const body = sections
    .filter((section) => section.length > 0)
    .map((section) => section.join("\n"))
    .join("\n\n");
  logger.info("generateZodTypes completed", {
    moduleName: schema.moduleName,
    outputLength: body.length,
  });
  return banner ? `${banner}\n${body}\n` : `${body}\n`;
}
