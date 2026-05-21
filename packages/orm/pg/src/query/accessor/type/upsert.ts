import { ValuesMap } from "../../types";

/**
 * Options for `upsert` (single row).
 *
 * ```ts
 * user.upsert({
 *   data: { id: "usr_1", email: "a@b.com", name: "Alice" },
 *   onConflict: ["email"],
 *   returning: ["id", "email"],
 * })
 * ```
 */
export interface UpsertOptions<Cols extends string = string> {
  /** The row to insert or update. */
  data: ValuesMap<Cols>;
  /**
   * The unique-constraint column(s) that define the conflict target.
   * Maps to `ON CONFLICT (col1, col2, …)`.
   */
  onConflict: Cols[];
  /**
   * Columns to update when a conflict is detected (via `EXCLUDED.<col>`).
   * When omitted, every inserted column except the conflict columns is updated.
   */
  updateColumns?: Cols[];
  /**
   * Explicit column → value overrides for the `DO UPDATE SET` clause.
   * Takes precedence over `updateColumns` / `EXCLUDED` fallback for the
   * keys it specifies.
   */
  set?: ValuesMap<Cols>;
  /** Columns to return.  Omit for `RETURNING *`. */
  returning?: Cols[];
}

/**
 * Options for `upsertMany` (bulk rows).
 *
 * ```ts
 * user.upsertMany({
 *   data: [
 *     { id: "usr_1", email: "a@b.com", name: "Alice" },
 *     { id: "usr_2", email: "b@b.com", name: "Bob" },
 *   ],
 *   onConflict: ["email"],
 *   returning: ["id"],
 * })
 * ```
 */
export interface UpsertManyOptions<Cols extends string = string> {
  /** The rows to insert or update. */
  data: ValuesMap<Cols>[];
  /**
   * The unique-constraint column(s) that define the conflict target.
   * Maps to `ON CONFLICT (col1, col2, …)`.
   */
  onConflict: Cols[];
  /**
   * Columns to update when a conflict is detected (via `EXCLUDED.<col>`).
   * When omitted, every inserted column except the conflict columns is updated.
   */
  updateColumns?: Cols[];
  /**
   * Explicit column → value overrides for the `DO UPDATE SET` clause.
   * Takes precedence over `updateColumns` / `EXCLUDED` fallback for the
   * keys it specifies.
   */
  set?: ValuesMap<Cols>;
  /** Columns to return.  Omit for `RETURNING *`. */
  returning?: Cols[];
}
