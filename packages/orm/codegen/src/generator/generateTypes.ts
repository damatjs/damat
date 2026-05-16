import { DEFAULT_AUTO_FIELDS } from '@/defaults';
import { buildRelationMap } from '@/relation';
import {
  GenerateTypesOptions,
  generateEnumTypes,
  generateRowInterface,
  generateNewType,
  generateUpdateType
} from '@/utils';
import { ModuleSchema } from "@damatjs/orm-type";
import { getLogger } from "@damatjs/logger";

const logger = getLogger();

export function generateTypes(
  schema: ModuleSchema,
  options: GenerateTypesOptions = {},
): string {
  logger.info("generateTypes started", {
    moduleName: schema.moduleName,
    tableCount: schema.tables.length,
    hasEnums: (schema.enums ?? []).length > 0,
    hasRelationships: (schema.relationships ?? []).length > 0
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
  if (enumLines.length > 0) {
    sections.push(enumLines);
  }

  for (const table of schema.tables) {
    const rels = relationMap.get(table.name) ?? [];

    sections.push(generateRowInterface(table, rels));
    sections.push(generateNewType(table, autoFields));
    sections.push(generateUpdateType(table));
  }

  const body = sections.map((s) => s.join("\n")).join("\n\n");

  logger.info("generateTypes completed", {
    moduleName: schema.moduleName,
    outputLength: body.length
  });

  return banner ? `${banner}\n${body}\n` : `${body}\n`;
}
