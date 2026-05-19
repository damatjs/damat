import {
  ValuesMap,
} from "../../types";
import { OnConflictClause } from "../../insert";

/**
 * Options for `create`.
 *
 * ```ts
 * user.create({
 *   data: { id: "usr_1", email: "a@b.com", name: "Alice" },
 *   returning: ["id", "email"],
 * })
 * ```
 */
export interface CreateOptions<Cols extends string = string> {
  /** The row to insert. */
  data: ValuesMap<Cols>;
  /** Columns to return.  Omit for `RETURNING *`. */
  returning?: Cols[];
  /** ON CONFLICT handling. */
  onConflict?: OnConflictClause<Cols>;
}

/**
 * Options for `createMany`.
 *
 * ```ts
 * user.createMany({
 *   data: [
 *     { id: "usr_1", email: "a@b.com" },
 *     { id: "usr_2", email: "b@b.com" },
 *   ],
 *   returning: ["id"],
 * })
 * ```
 */
export interface CreateManyOptions<Cols extends string = string> {
  /** The rows to insert. */
  data: ValuesMap<Cols>[];
  /** Columns to return.  Omit for `RETURNING *`. */
  returning?: Cols[];
  /** ON CONFLICT handling. */
  onConflict?: OnConflictClause<Cols>;
}
