import { quoteIdent } from "../helpers";
import { ValuesMap } from "../types";

export type OnConflictAction = "nothing" | "update";

export interface OnConflictClause<Cols extends string = string> {
  conflictColumns?: Cols[];
  action: OnConflictAction;
  set?: ValuesMap<Cols>;
}

export function buildOnConflictSql(
  clause: OnConflictClause,
  params: unknown[],
): string {
  const target =
    clause.conflictColumns && clause.conflictColumns.length > 0
      ? `(${clause.conflictColumns.map(quoteIdent).join(", ")})`
      : "";

  if (clause.action === "nothing") {
    return `ON CONFLICT ${target} DO NOTHING`.trimEnd();
  }

  const set = clause.set as Record<string, unknown> | undefined;
  let setFragments: string[];

  if (set && Object.keys(set).length > 0) {
    setFragments = Object.entries(set).map(([col, val]) => {
      params.push(val);
      return `${quoteIdent(col)} = $${params.length}`;
    });
  } else {
    const targetCols = clause.conflictColumns ?? [];
    if (targetCols.length > 0) {
      setFragments = targetCols.map(
        (col) => `${quoteIdent(col)} = EXCLUDED.${quoteIdent(col)}`,
      );
    } else {
      setFragments = [`"id" = EXCLUDED."id"`];
    }
  }

  return `ON CONFLICT ${target} DO UPDATE SET ${setFragments.join(", ")}`.trimEnd();
}
