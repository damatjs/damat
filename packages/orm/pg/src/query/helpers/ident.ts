export interface TableRef {
  schema?: string;
  name: string;
}

export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export function buildTableRef(ref: TableRef): string {
  return ref.schema
    ? `${quoteIdent(ref.schema)}.${quoteIdent(ref.name)}`
    : quoteIdent(ref.name);
}
