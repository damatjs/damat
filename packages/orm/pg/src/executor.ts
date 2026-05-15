import type { Pool, PoolClient, QueryResultRow } from "@damatjs/deps/pg";
import type {
  BuiltQuery,
  SelectDescriptor,
  InsertDescriptor,
  UpdateDescriptor,
  DeleteDescriptor,
  UpsertDescriptor,
} from "@damatjs/orm-model";
import type {
  PgSelectResult,
  PgInsertResult,
  PgUpdateResult,
  PgDeleteResult,
} from "./types";
import { getQueryLogger, type QueryLogger } from "./logger";

// ─── Low-level execute helpers ────────────────────────────────────────────────
//
// These functions accept a `BuiltQuery` (from any builder's `.generateSql()`)
// and a pg `Pool` or `PoolClient`, run the query, and return a typed result.
//
// The `T` generic is the TypeScript row interface — the link between the
// query descriptor and the data it returns.  With codegen:
//
//   import type { User } from "./generated/types";
//   const result = await pgSelect<User>(pool, builtQuery, descriptor);
//   result.rows; // User[]
//
// Without codegen, `T` defaults to `Record<string, unknown>`.

// ─── Shared executor ─────────────────────────────────────────────────────────

/**
 * Execute a single parameterised query against a pg Pool (or client).
 *
 * Returns the raw pg `QueryResult` rows cast to `T`.
 * This is the lowest-level helper — prefer the typed wrappers below.
 */
export async function pgExecuteRaw<
  T extends QueryResultRow = Record<string, unknown>,
>(
  conn: Pool | PoolClient,
  query: BuiltQuery,
  logger?: QueryLogger,
): Promise<{ rows: T[]; rowCount: number }> {
  const loggerInstance = logger ?? getQueryLogger();
  const startTime = Date.now();
  
  try {
    loggerInstance.logQuery(query.sql, query.params);
    const result = await conn.query<T>(query.sql, query.params as unknown[]);
    const duration = Date.now() - startTime;
    loggerInstance.logSlowQuery(query.sql, duration, query.params);
    return {
      rows: result.rows,
      rowCount: result.rowCount ?? result.rows.length,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    loggerInstance.logQueryError(err, query.sql, query.params);
    throw error;
  }
}

// ─── SELECT ───────────────────────────────────────────────────────────────────

/**
 * Execute a `SELECT` query and return typed rows.
 *
 * The `descriptor` is stored on the result so the caller always has the full
 * query intent alongside the data — useful for logging, caching, transforms.
 *
 * ```ts
 * import type { User } from "./generated/types";
 *
 * const builder = new SelectBuilder(UserSchema)
 *   .columns(["id", "email"])
 *   .where({ verified: true });
 *
 * const result = await pgSelect<User>(pool, builder.generateSql(), builder.generateJson());
 * result.rows;        // User[]
 * result.rowCount;    // number
 * result.descriptor;  // SelectDescriptor
 * ```
 */
export async function pgSelect<
  T extends QueryResultRow = Record<string, unknown>,
>(
  conn: Pool | PoolClient,
  query: BuiltQuery,
  descriptor: SelectDescriptor,
  logger?: QueryLogger,
): Promise<PgSelectResult<T>> {
  const { rows, rowCount } = await pgExecuteRaw<T>(conn, query, logger);
  return { rows, rowCount, descriptor };
}

// ─── INSERT ───────────────────────────────────────────────────────────────────

/**
 * Execute an `INSERT` query and return the RETURNING rows typed as `T`.
 *
 * ```ts
 * import type { User } from "./generated/types";
 *
 * const builder = new InsertBuilder(UserSchema)
 *   .values({ id: "usr_1", email: "a@b.com", name: "Alice" })
 *   .returning(["id", "email"]);
 *
 * const result = await pgInsert<User>(pool, builder.generateSql(), builder.generateJson());
 * result.rows;        // User[] — the inserted rows
 * result.rowCount;    // 1
 * result.descriptor;  // InsertDescriptor
 * ```
 */
export async function pgInsert<
  T extends QueryResultRow = Record<string, unknown>,
>(
  conn: Pool | PoolClient,
  query: BuiltQuery,
  descriptor: InsertDescriptor | UpsertDescriptor,
  logger?: QueryLogger,
): Promise<PgInsertResult<T>> {
  const { rows, rowCount } = await pgExecuteRaw<T>(conn, query, logger);
  return { rows, rowCount, descriptor };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

/**
 * Execute an `UPDATE` query and return the RETURNING rows typed as `T`.
 *
 * ```ts
 * import type { User } from "./generated/types";
 *
 * const builder = new UpdateBuilder(UserSchema)
 *   .set({ verified: true })
 *   .where({ email: "a@b.com" })
 *   .returning(["id", "verified"]);
 *
 * const result = await pgUpdate<User>(pool, builder.generateSql(), builder.generateJson());
 * result.rows;        // User[]
 * result.rowCount;    // number of rows updated
 * result.descriptor;  // UpdateDescriptor
 * ```
 */
export async function pgUpdate<
  T extends QueryResultRow = Record<string, unknown>,
>(
  conn: Pool | PoolClient,
  query: BuiltQuery,
  descriptor: UpdateDescriptor,
  logger?: QueryLogger,
): Promise<PgUpdateResult<T>> {
  const { rows, rowCount } = await pgExecuteRaw<T>(conn, query, logger);
  return { rows, rowCount, descriptor };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

/**
 * Execute a `DELETE` query and return the RETURNING rows typed as `T`.
 *
 * ```ts
 * import type { User } from "./generated/types";
 *
 * const builder = new DeleteBuilder(UserSchema)
 *   .where({ id: "usr_1" })
 *   .returning(["id"]);
 *
 * const result = await pgDelete<User>(pool, builder.generateSql(), builder.generateJson());
 * result.rows;        // User[]
 * result.rowCount;    // 1
 * result.descriptor;  // DeleteDescriptor
 * ```
 */
export async function pgDelete<
  T extends QueryResultRow = Record<string, unknown>,
>(
  conn: Pool | PoolClient,
  query: BuiltQuery,
  descriptor: DeleteDescriptor,
  logger?: QueryLogger,
): Promise<PgDeleteResult<T>> {
  const { rows, rowCount } = await pgExecuteRaw<T>(conn, query, logger);
  return { rows, rowCount, descriptor };
}

// ─── Transaction helper ───────────────────────────────────────────────────────

/**
 * Run a callback inside a single pg transaction.
 *
 * Commits on success, rolls back on any thrown error.
 * The `PoolClient` passed to the callback should be used for all queries
 * within the transaction.
 *
 * ```ts
 * await pgTransaction(pool, async (client) => {
 *   await pgInsert<User>(client, userQuery, userDescriptor);
 *   await pgInsert<Order>(client, orderQuery, orderDescriptor);
 * });
 * ```
 */
export async function pgTransaction<R>(
  pool: Pool,
  callback: (client: PoolClient) => Promise<R>,
  logger?: QueryLogger,
): Promise<R> {
  const loggerInstance = logger ?? getQueryLogger();
  const client = await pool.connect();
  try {
    loggerInstance.logTransaction("begin");
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    loggerInstance.logTransaction("commit");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    loggerInstance.logTransaction("rollback");
    throw err;
  } finally {
    client.release();
  }
}
