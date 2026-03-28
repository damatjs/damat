import {
  RawWhereClause,
  WhereClause,
} from "../../types";


/**
 * Options for `delete`.
 *
 * ```ts
 * user.delete({
 *   where: { id: "usr_1" },
 *   returning: ["id"],
 * })
 * ```
 */
export interface DeleteOptions<Cols extends string = string> {
  /** Object-style WHERE conditions. */
  where?: WhereClause<Cols>;
  /** Raw SQL WHERE fragments. */
  whereRaw?: RawWhereClause | RawWhereClause[];
  /** Columns to return.  Omit for `RETURNING *`. */
  returning?: Cols[];
  /** Allow deleting without a WHERE clause (removes all rows). */
  allowFullTable?: boolean;
}
