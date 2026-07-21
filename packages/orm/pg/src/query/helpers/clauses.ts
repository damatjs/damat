import type { OrderByClause } from "../types";
import { quoteIdent } from "./ident";

// `direction`/`nulls` are string-interpolated (not parameterizable in SQL), so
// they are whitelisted here rather than trusting the compile-time union — the
// values can originate from untrusted JSON via the service/link layers.
const ORDER_DIRECTIONS = new Set(["ASC", "DESC"]);
const ORDER_NULLS = new Set(["NULLS FIRST", "NULLS LAST"]);

export function buildOrderByClause(clauses: OrderByClause[]): string {
  if (clauses.length === 0) return "";
  const parts = clauses.map((c) => {
    let s = quoteIdent(c.column);
    if (c.direction) {
      const dir = String(c.direction).toUpperCase();
      if (!ORDER_DIRECTIONS.has(dir)) {
        throw new Error(
          `[query:orderBy] Invalid direction "${c.direction}" (expected ASC or DESC)`,
        );
      }
      s += ` ${dir}`;
    }
    if (c.nulls) {
      const nulls = String(c.nulls).toUpperCase();
      if (!ORDER_NULLS.has(nulls)) {
        throw new Error(
          `[query:orderBy] Invalid nulls "${c.nulls}" (expected NULLS FIRST or NULLS LAST)`,
        );
      }
      s += ` ${nulls}`;
    }
    return s;
  });
  return `ORDER BY ${parts.join(", ")}`;
}

export function buildReturningClause(cols: string[]): string {
  if (cols.length === 0) return "RETURNING *";
  return `RETURNING ${cols.map(quoteIdent).join(", ")}`;
}
