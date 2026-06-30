import { toPascalCase } from "@/utils/stringConvertor";

export function tableToFileName(tableName: string): string {
  return tableName.replace(/_/g, "-");
}

export function getRelationImports(
  tableName: string,
  schema: import("@damatjs/orm-type").ModuleSchema,
): Array<{ typeName: string; fileName: string }> {
  const rels = schema.relationships ?? [];
  // Skip self-referential relations (e.g. a category tree's parent/children):
  // the target type is declared locally in this same file, so importing it
  // from "./<self>" produces a self-import that conflicts with the local
  // declaration (TS2440).
  const tableRels = rels.filter(
    (r) => r.fromTable === tableName && r.to !== tableName,
  );

  return tableRels.map((rel) => ({
    typeName: toPascalCase(rel.to),
    fileName: tableToFileName(rel.to),
  }));
}
