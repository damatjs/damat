import type { CrudNames } from "../../../naming";


export function routeCollectionQuery(n: CrudNames, typesSpec: string): string {
  return `// Query schema for GET /${n.fileBase}. Re-exported from generated types;
// narrow or extend it here if this endpoint needs a custom query surface.
export { ${n.querySchema}, type ${n.queryType} } from "${typesSpec}";
`;
}
