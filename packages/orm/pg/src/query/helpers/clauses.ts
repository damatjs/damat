import type { OrderByClause } from "../types";
import { quoteIdent } from "./ident";

export function buildOrderByClause(clauses: OrderByClause[]): string {
  if (clauses.length === 0) return "";
  const parts = clauses.map((c) => {
    let s = quoteIdent(c.column);
    if (c.direction) s += ` ${c.direction}`;
    if (c.nulls) s += ` ${c.nulls}`;
    return s;
  });
  return `ORDER BY ${parts.join(", ")}`;
}

export function buildReturningClause(cols: string[]): string {
  if (cols.length === 0) return "RETURNING *";
  return `RETURNING ${cols.map(quoteIdent).join(", ")}`;
}
