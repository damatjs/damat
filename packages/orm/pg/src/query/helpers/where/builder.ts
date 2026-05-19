import type { RawWhereClause, WhereClause } from "../../types";
import { quoteIdent } from "../ident";
import { assertKnownColumns } from "../asserts";
import { compileCondition } from "./condition";

export function buildWhereClause(
  whereClauses: WhereClause[],
  rawClauses: RawWhereClause[],
  params: unknown[],
  known: Set<string>,
): string {
  const fragments: string[] = [];

  for (const clause of whereClauses) {
    assertKnownColumns(clause as Record<string, unknown>, known, "where");
    for (const [col, val] of Object.entries(clause)) {
      fragments.push(compileCondition(quoteIdent(col), val, params));
    }
  }

  for (const raw of rawClauses) {
    const offset = params.length;
    const renumbered = raw.sql.replace(
      /\$(\d+)/g,
      (_, n: string) => `$${parseInt(n, 10) + offset}`,
    );
    if (raw.params) params.push(...raw.params);
    fragments.push(renumbered);
  }

  if (fragments.length === 0) return "";
  return `WHERE ${fragments.join(" AND ")}`;
}
