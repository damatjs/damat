import type { BuiltQuery } from "../types";

export function joinSqlParts(parts: string[]): string {
  return parts.filter((p) => p.length > 0).join(" ");
}

export function assembleQuery(parts: string[], params: unknown[]): BuiltQuery {
  return { sql: joinSqlParts(parts), params };
}

export function generateSql(builder: {
  generateSql(): BuiltQuery;
}): BuiltQuery {
  return builder.generateSql();
}
