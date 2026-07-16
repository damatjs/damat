import type { ModuleSchema } from "@damatjs/orm-type";
import { generationLogger, type GenerationLogger } from "@/logger";
import { getTableEnums } from "@/render/enums";
import { toEnumTypeName } from "@/render/naming";
import { generateNewType } from "@/render/newType";
import { generateRowInterface } from "@/render/rowInterface";
import { generateUpdateType } from "@/render/updateType";
import { getRelationImports } from "./helpers";

export function generateTableFile(
  table: ModuleSchema["tables"][number],
  schema: ModuleSchema,
  autoFields: Set<string>,
  banner: string | null,
  loggerData?: GenerationLogger,
): string {
  const logger = generationLogger(loggerData);
  logger.debug("generateTableFile started", {
    tableName: table.name,
    columnCount: table.columns.length,
  });

  const allEnums = schema.enums ?? [];
  const rels = (schema.relationships ?? []).filter(
    (r) => r.fromTable === table.name,
  );

  const tableEnums = getTableEnums(table, allEnums);
  const enumImportLine =
    tableEnums.length > 0
      ? `import type { ${tableEnums.map((e) => toEnumTypeName(e.name)).join(", ")} } from "./enums";`
      : null;

  const relImports = getRelationImports(table.name, schema);
  const seen = new Set<string>();
  const uniqueRelImports = relImports.filter(({ typeName }) => {
    if (seen.has(typeName)) return false;
    seen.add(typeName);
    return true;
  });

  const relImportLines = uniqueRelImports.map(
    ({ typeName, fileName }) =>
      `import type { ${typeName} } from "./${fileName}";`,
  );

  const sections: string[][] = [];

  const allImportLines = [
    ...(enumImportLine ? [enumImportLine] : []),
    ...relImportLines,
  ];
  if (allImportLines.length > 0) {
    sections.push(allImportLines);
  }

  sections.push(generateRowInterface(table, rels));
  sections.push(generateNewType(table, autoFields));
  sections.push(generateUpdateType(table));

  const body = sections.map((s) => s.join("\n")).join("\n\n");

  logger.debug("generateTableFile completed", {
    tableName: table.name,
    hasEnumImports: tableEnums.length > 0,
    relationCount: uniqueRelImports.length,
  });

  return banner ? `${banner}\n${body}\n` : `${body}\n`;
}
