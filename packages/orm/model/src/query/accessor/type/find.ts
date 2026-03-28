import {
  OrderDirection,
  RawWhereClause,
  WhereClause,
} from "../../types";
import { RelationIncludeMap } from "../../relations";

/**
 * Options for `findMany` / `findOne`.
 *
 * ```ts
 * user.findMany({
 *   select: ["id", "email"],
 *   where: { verified: true, age: { gte: 18 } },
 *   orderBy: [{ column: "name", direction: "ASC" }],
 *   limit: 10,
 *   offset: 0,
 * })
 * ```
 */
export interface FindOptions<Cols extends string = string> {
  /** Columns to return.  Omit for all columns (`SELECT *`). */
  select?: Cols[];
  /** Object-style WHERE conditions. */
  where?: WhereClause<Cols>;
  /** Raw SQL WHERE fragments. */
  whereRaw?: RawWhereClause | RawWhereClause[];
  /** ORDER BY clauses. */
  orderBy?: Array<{
    column: Cols;
    direction?: OrderDirection;
    nulls?: "NULLS FIRST" | "NULLS LAST";
  }>;
  /** Max rows to return. */
  limit?: number;
  /** Rows to skip. */
  offset?: number;
  /** Add DISTINCT. */
  distinct?: boolean;
  /**
   * Relations to include with the query (Drizzle-style nested loading).
   * Every key must match a relation property on the model — enforced by
   * the schema guard in `SelectBuilder.with()`.
   */
  with?: RelationIncludeMap;
}
