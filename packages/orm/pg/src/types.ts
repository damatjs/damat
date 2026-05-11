import type { QueryResultRow } from "@damatjs/deps/pg";
import type {
  SelectDescriptor,
  InsertDescriptor,
  UpdateDescriptor,
  DeleteDescriptor,
  UpsertDescriptor,
} from "@damatjs/orm-model";

// ─── PgQueryResult ────────────────────────────────────────────────────────────
//
// The return type from every execution function carries:
//   - `rows`      — the actual data, typed as T[]
//   - `rowCount`  — how many rows were affected / returned
//   - `descriptor`— the structured QueryDescriptor that produced this SQL,
//                   so the caller always has the intent alongside the data
//
// The `T` parameter is the TypeScript row type — the link between the
// schema and the result.  With codegen, `T` is narrowed to the generated
// interface (e.g. `User`, `Order`).  Without codegen, `T` defaults to
// `Record<string, unknown>` so callers can still use results without types.

/**
 * The result of executing a `SELECT` query via pg.
 *
 * `T` should be the generated row interface for the model, e.g. `User`.
 * When relations were included via `.with()`, the nested data arrives as
 * JSON in each row — the type reflects this via the optional relation fields
 * on the row interface.
 *
 * ```ts
 * import type { User } from "./generated/types";
 *
 * const result = await pgClient.findMany<User>({ where: { verified: true } });
 * result.rows;        // User[]
 * result.rowCount;    // number
 * result.descriptor;  // SelectDescriptor
 * ```
 */
export interface PgSelectResult<
  T extends QueryResultRow = Record<string, unknown>,
> {
  /** The returned rows, typed as `T`. */
  rows: T[];
  /** Number of rows returned. */
  rowCount: number;
  /** The structured descriptor that was used to build the SQL. */
  descriptor: SelectDescriptor;
}

/**
 * The result of executing an `INSERT` query via pg.
 *
 * `T` is the shape of the returned rows (from `RETURNING`).
 *
 * ```ts
 * import type { User } from "./generated/types";
 *
 * const result = await pgClient.create<User>({ data: { ... }, returning: ["id"] });
 * result.rows;        // User[] — the inserted rows
 * result.rowCount;    // number
 * result.descriptor;  // InsertDescriptor
 * ```
 */
export interface PgInsertResult<
  T extends QueryResultRow = Record<string, unknown>,
> {
  /** The returned rows (from `RETURNING`), typed as `T`. */
  rows: T[];
  /** Number of rows inserted. */
  rowCount: number;
  /** The structured descriptor that was used to build the SQL. */
  descriptor: InsertDescriptor | UpsertDescriptor;
}

/**
 * The result of executing an `UPDATE` query via pg.
 *
 * `T` is the shape of the returned rows (from `RETURNING`).
 *
 * ```ts
 * import type { User } from "./generated/types";
 *
 * const result = await pgClient.update<User>({ set: { verified: true }, where: { id: "usr_1" } });
 * result.rows;        // User[]
 * result.rowCount;    // number
 * result.descriptor;  // UpdateDescriptor
 * ```
 */
export interface PgUpdateResult<
  T extends QueryResultRow = Record<string, unknown>,
> {
  /** The returned rows (from `RETURNING`), typed as `T`. */
  rows: T[];
  /** Number of rows updated. */
  rowCount: number;
  /** The structured descriptor that was used to build the SQL. */
  descriptor: UpdateDescriptor;
}

/**
 * The result of executing a `DELETE` query via pg.
 *
 * `T` is the shape of the returned rows (from `RETURNING`).
 *
 * ```ts
 * import type { User } from "./generated/types";
 *
 * const result = await pgClient.delete<User>({ where: { id: "usr_1" } });
 * result.rows;        // User[]
 * result.rowCount;    // number
 * result.descriptor;  // DeleteDescriptor
 * ```
 */
export interface PgDeleteResult<
  T extends QueryResultRow = Record<string, unknown>,
> {
  /** The returned rows (from `RETURNING`), typed as `T`. */
  rows: T[];
  /** Number of rows deleted. */
  rowCount: number;
  /** The structured descriptor that was used to build the SQL. */
  descriptor: DeleteDescriptor;
}

/**
 * Union of all four result types.
 * Discriminated via the `descriptor.type` field.
 */
export type PgQueryResult<T extends QueryResultRow = Record<string, unknown>> =
  | PgSelectResult<T>
  | PgInsertResult<T>
  | PgUpdateResult<T>
  | PgDeleteResult<T>;
