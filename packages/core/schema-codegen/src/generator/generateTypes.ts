import type { ModuleSchema } from "@damatjs/orm-type";
import { DEFAULT_AUTO_FIELDS } from "@/defaults";
import { generationLogger, type GenerationLogger } from "@/logger";
import { buildRelationMap } from "@/relation";
import { generateEnumTypes } from "@/render/enums";
import { generateNewType } from "@/render/newType";
import { generateRowInterface } from "@/render/rowInterface";
import { generateUpdateType } from "@/render/updateType";
import type { GenerateTypesOptions } from "@/types";

export function generateTypes(
  schema: ModuleSchema,
  options: GenerateTypesOptions = {},
  loggerData?: GenerationLogger,
): string {
  const logger = generationLogger(loggerData);
  logger.info("generateTypes started", {
    moduleName: schema.moduleName,
    tableCount: schema.tables.length,
    hasEnums: (schema.enums ?? []).length > 0,
    hasRelationships: (schema.relationships ?? []).length > 0,
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
  const relationMap = buildRelationMap(schema.relationships ?? []);
  const sections: string[][] = [];
  const enumLines = generateEnumTypes(schema);
  if (enumLines.length > 0) sections.push(enumLines);

  for (const table of schema.tables) {
    const relations = relationMap.get(table.name) ?? [];
    sections.push(generateRowInterface(table, relations));
    sections.push(generateNewType(table, autoFields));
    sections.push(generateUpdateType(table));
  }
  const body = sections.map((section) => section.join("\n")).join("\n\n");
  logger.info("generateTypes completed", {
    moduleName: schema.moduleName,
    outputLength: body.length,
  });
  return banner ? `${banner}\n${body}\n` : `${body}\n`;
}
