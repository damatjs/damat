import { toPascalCase } from "@/render/naming";

export function tableToFileName(tableName: string): string {
  return tableName.replace(/_/g, "-");
}

export function getRelationImports(
  tableName: string,
  schema: import("@damatjs/orm-type").ModuleSchema,
): Array<{ typeName: string; fileName: string }> {
  const rels = schema.relationships ?? [];
  const tableRels = rels.filter(
    (r) => r.fromTable === tableName && r.to !== tableName,
  );

  return tableRels.map((rel) => ({
    typeName: toPascalCase(rel.to),
    fileName: tableToFileName(rel.to),
  }));
}
