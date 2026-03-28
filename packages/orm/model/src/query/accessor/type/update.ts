import {
  RawWhereClause,
  ValuesMap,
  WhereClause,
} from "../../types";

/**
 * Options for `update`.
 *
 * ```ts
 * user.update({
 *   set: { verified: true },
 *   where: { email: "a@b.com" },
 *   returning: ["id", "verified"],
 * })
 * ```
 */
export interface UpdateOptions<Cols extends string = string> {
  /** Column → value pairs to apply. */
  set: ValuesMap<Cols>;
  /** Object-style WHERE conditions. */
  where?: WhereClause<Cols>;
  /** Raw SQL WHERE fragments. */
  whereRaw?: RawWhereClause | RawWhereClause[];
  /** Columns to return.  Omit for `RETURNING *`. */
  returning?: Cols[];
  /** Allow updating without a WHERE clause (affects all rows). */
  allowFullTable?: boolean;
}
