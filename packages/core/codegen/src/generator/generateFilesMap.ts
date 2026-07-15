import { ModuleSchema } from "@damatjs/orm-type";
import {
  GenerateTypesOptions,
  GeneratedFilesMap,
  generateEnumsFile,
} from "@/utils";
import { DEFAULT_AUTO_FIELDS } from "@/defaults";
import { generateTableFile } from "./generateTableFile";
import { generateZodFile } from "./generateZodFile";
import { tableToFileName } from "./helpers";
import { getLogger, type ILogger } from "@damatjs/logger";

type GenerationLogger = Pick<ILogger, "debug" | "info">;

export function generateFilesMap(
  schema: ModuleSchema,
  options: GenerateTypesOptions = {},
  loggerData?: GenerationLogger,
): GeneratedFilesMap {
  const logger = loggerData ?? getLogger();

  logger.info("generateFilesMap started", {
    moduleName: schema.moduleName,
    tableCount: schema.tables.length,
    enumCount: (schema.enums ?? []).length,
    relationshipCount: (schema.relationships ?? []).length,
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

  const result: GeneratedFilesMap = new Map();

  const hasEnums = (schema.enums ?? []).length > 0;
  if (hasEnums) {
    logger.debug("Generating enums.ts");
    result.set("enums.ts", generateEnumsFile(schema, banner)!);
  }

  for (const table of schema.tables) {
    const fileName = `${tableToFileName(table.name)}.ts`;
    logger.debug("Generating table file", { tableName: table.name, fileName });
    result.set(fileName, generateTableFile(table, schema, autoFields, banner));

    // Generate Zod schema file
    const zodFileName = `${tableToFileName(table.name)}.zod.ts`;
    logger.debug("Generating zod file", { tableName: table.name, zodFileName });
    result.set(zodFileName, generateZodFile(table, schema, banner));
  }

  const exportLines: string[] = [];

  if (hasEnums) {
    exportLines.push(`export * from "./enums";`);
  }
  for (const table of schema.tables) {
    exportLines.push(`export * from "./${tableToFileName(table.name)}";`);
    exportLines.push(`export * from "./${tableToFileName(table.name)}.zod";`);
  }

  const indexBody = exportLines.join("\n");
  result.set(
    "index.ts",
    banner ? `${banner}\n${indexBody}\n` : `${indexBody}\n`,
  );

  logger.info("generateFilesMap completed", {
    moduleName: schema.moduleName,
    fileCount: result.size,
    files: Array.from(result.keys()),
  });

  return result;
}
