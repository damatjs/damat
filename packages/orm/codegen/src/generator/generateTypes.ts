import { DEFAULT_AUTO_FIELDS } from "@/defaults";
import { buildRelationMap } from "@/relation";
import {
  GenerateTypesOptions,
  generateEnumTypes,
  generateRowInterface,
  generateNewType,
  generateUpdateType,
  generateNewZodSchema,
  generateUpdateZodSchema,
  generateQueryZodSchema,
  generateIdZodSchema,
} from "@/utils";
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
    outputLength: body.length,
  });

  return banner ? `${banner}\n${body}\n` : `${body}\n`;
}

/**
 * Generate all Zod schemas for a module in a single file.
 *
 * Produces:
 * - Zod import statement
 * - New input schemas for each table
 * - Update input schemas for each table
 * - Query schemas for each table
 * - ID schemas for each table
 *
 * Note: For file-per-table output, use `generateFilesMap` instead.
 */
export function generateZodTypes(
  schema: ModuleSchema,
  options: GenerateTypesOptions = {},
): string {
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

  const sections: string[][] = [];

  // Add zod import
  sections.push([`import { z } from "@damatjs/deps/zod";`]);

  for (const table of schema.tables) {
    sections.push(generateNewZodSchema(table, autoFields, allEnums));
    sections.push(generateUpdateZodSchema(table, allEnums));
    sections.push(generateQueryZodSchema(table, allEnums));
    sections.push(generateIdZodSchema(table));
  }

  const body = sections
    .filter((s) => s.length > 0)
    .map((s) => s.join("\n"))
    .join("\n\n");

  logger.info("generateZodTypes completed", {
    moduleName: schema.moduleName,
    outputLength: body.length,
  });

  return banner ? `${banner}\n${body}\n` : `${body}\n`;
}
