import type { Pool, PoolClient, QueryResultRow } from "@damatjs/deps/pg";
import {
  ModelAccessor,
  type FindOptions,
  type CreateOptions,
  type CreateManyOptions,
  type UpdateOptions,
  type DeleteOptions,
  type UpsertOptions,
  type SelectDescriptor,
  type InsertDescriptor,
  type UpdateDescriptor,
  type DeleteDescriptor,
  ModelDefinition,
  UpsertDescriptor,
} from "@damatjs/orm-model";
import {
  pgSelect,
  pgInsert,
  pgUpdate,
  pgDelete,
  pgTransaction,
} from "./executor";
import type {
  PgSelectResult,
  PgInsertResult,
  PgUpdateResult,
  PgDeleteResult,
} from "./types";
import type { QueryLogger } from "./logger";

// ─── PgModelClient ────────────────────────────────────────────────────────────

/**
 * Ergonomic execution client that binds a `ModelDefinition`, a pg `Pool`,
 * and the TypeScript row type `T` together — so every query method returns
 * rows typed as `T`.
 *
 * ### Setup
 * ```ts
 * import { Pool } from "@damatjs/deps/pg";
 * import { PgModelClient } from "@damatjs/orm-pg";
 * import { UserSchema } from "./schema";
 * import type { User } from "./generated/types";
 *
 * const pool = new Pool({ connectionString: process.env.DATABASE_URL });
 *
 * // Bind the pool + model + TypeScript row type together once
 * const userClient = new PgModelClient<User>(UserSchema, pool);
 * ```
 *
 * ### findMany
 * ```ts
 * const result = await userClient.findMany({
 *   select: ["id", "email"],
 *   where: { verified: true, age: { gte: 18 } },
 *   orderBy: [{ column: "name", direction: "ASC" }],
 *   limit: 20,
 * });
 *
 * result.rows;        // User[]         ← fully typed
 * result.rowCount;    // number
 * result.descriptor;  // SelectDescriptor
 * ```
 *
 * ### findOne
 * ```ts
 * const result = await userClient.findOne({ where: { id: "usr_1" } });
 * result.rows[0];     // User | undefined
 * ```
 *
 * ### With relation loading (schema-guarded)
 * ```ts
 * const result = await userClient.findMany({
 *   select: ["id", "email"],
 *   with: {
 *     orders: {                // ← guard throws RelationGuardError if "orders"
 *       select: ["id", "total"], //   is not declared on UserSchema
 *       where: { status: "pending" },
 *     },
 *   },
 * });
 * result.rows;  // User[] — each row has an `orders` JSON field
 * ```
 *
 * ### create / createMany
 * ```ts
 * const result = await userClient.create({
 *   data: { id: "usr_1", email: "a@b.com", name: "Alice" },
 *   returning: ["id", "email"],
 * });
 * result.rows[0];  // User
 * ```
 *
 * ### update
 * ```ts
 * const result = await userClient.update({
 *   set: { verified: true },
 *   where: { email: "a@b.com" },
 *   returning: ["id", "verified"],
 * });
 * result.rows[0];  // User
 * ```
 *
 * ### delete
 * ```ts
 * const result = await userClient.delete({ where: { id: "usr_1" } });
 * result.rows[0];  // User
 * ```
 *
 * ### Transactions
 * Use `.transaction()` to run multiple operations atomically:
 * ```ts
 * await userClient.transaction(async (tx) => {
 *   await tx.create({ data: { id: "usr_2", email: "b@b.com", name: "Bob" } });
 *   await tx.update({ set: { verified: true }, where: { id: "usr_2" } });
 * });
 * ```
 *
 * ### Raw builder access
 * When you need full builder flexibility, use `.accessor`:
 * ```ts
 * const q = userClient.accessor.builders.select
 *   .columns(["id"])
 *   .where({ verified: true })
 *   .distinct()
 *   .generateSql();
 * ```
 *
 * ### Using a specific PoolClient (e.g. inside a transaction callback)
 * ```ts
 * await pgTransaction(pool, async (client) => {
 *   const userTx = userClient.withClient(client);
 *   await userTx.create({ data: { ... } });
 * });
 * ```
 *
 * ### Generic column narrowing (with codegen)
 * ```ts
 * type UserCols = "id" | "email" | "name" | "verified" | "created_at" | "updated_at";
 * const userClient = new PgModelClient<User, UserCols>(UserSchema, pool);
 *
 * userClient.findMany({ select: ["id", "typo"] }); // ← TypeScript error
 * ```
 */
export class PgModelClient<
  T extends QueryResultRow = Record<string, unknown>,
  Cols extends string = string,
> {
  /** The underlying `ModelAccessor` — use `.accessor.builders.*` for advanced usage. */
  readonly accessor: ModelAccessor<Cols>;

  private readonly _pool: Pool;
  private readonly _conn: Pool | PoolClient;
  private readonly _logger: QueryLogger | undefined;

  constructor(
    model: ModelDefinition,
    pool: Pool,
    conn?: PoolClient,
    logger?: QueryLogger,
  ) {
    this.accessor = new ModelAccessor<Cols>(model);
    this._pool = pool;
    this._conn = conn ?? pool;
    this._logger = logger ?? undefined;
  }

  // ─── findMany ─────────────────────────────────────────────────────────────

  /**
   * Execute a `SELECT` query that may return multiple rows.
   *
   * ```ts
   * const { rows } = await userClient.findMany({
   *   select: ["id", "email"],
   *   where: { verified: true },
   *   limit: 20,
   * });
   * // rows: User[]
   * ```
   */
  async findMany(options: FindOptions<Cols> = {}): Promise<PgSelectResult<T>> {
    const { sql, json } = this.accessor.findMany(options);
    return pgSelect<T>(this._conn, sql, json as SelectDescriptor, this._logger);
  }

  // ─── findOne ──────────────────────────────────────────────────────────────

  /**
   * Execute a `SELECT` that returns at most one row (implicit `LIMIT 1`).
   *
   * ```ts
   * const { rows } = await userClient.findOne({ where: { id: "usr_1" } });
   * const user = rows[0]; // User | undefined
   * ```
   */
  async findOne(
    options: Omit<FindOptions<Cols>, "limit" | "offset"> = {},
  ): Promise<PgSelectResult<T>> {
    const { sql, json } = this.accessor.findOne(options);
    return pgSelect<T>(this._conn, sql, json as SelectDescriptor, this._logger);
  }

  // ─── create ───────────────────────────────────────────────────────────────

  /**
   * Execute an `INSERT` for a single row.
   *
   * ```ts
   * const { rows } = await userClient.create({
   *   data: { id: "usr_1", email: "a@b.com", name: "Alice" },
   *   returning: ["id", "email"],
   * });
   * // rows[0]: User
   * ```
   */
  async create(options: CreateOptions<Cols>): Promise<PgInsertResult<T>> {
    const { sql, json } = this.accessor.create(options);
    return pgInsert<T>(this._conn, sql, json as InsertDescriptor, this._logger);
  }

  // ─── createMany ───────────────────────────────────────────────────────────

  /**
   * Execute a bulk `INSERT`.
   *
   * ```ts
   * const { rowCount } = await userClient.createMany({
   *   data: [
   *     { id: "usr_1", email: "a@b.com", name: "Alice" },
   *     { id: "usr_2", email: "b@b.com", name: "Bob" },
   *   ],
   * });
   * ```
   */
  async createMany(
    options: CreateManyOptions<Cols>,
  ): Promise<PgInsertResult<T>> {
    const { sql, json } = this.accessor.createMany(options);
    return pgInsert<T>(this._conn, sql, json as InsertDescriptor, this._logger);
  }

  // ─── update ───────────────────────────────────────────────────────────────

  /**
   * Execute an `UPDATE`.
   *
   * ```ts
   * const { rows } = await userClient.update({
   *   set: { verified: true },
   *   where: { email: "a@b.com" },
   *   returning: ["id", "verified"],
   * });
   * // rows[0]: User
   * ```
   */
  async update(options: UpdateOptions<Cols>): Promise<PgUpdateResult<T>> {
    const { sql, json } = this.accessor.update(options);
    return pgUpdate<T>(this._conn, sql, json as UpdateDescriptor, this._logger);
  }

  // ─── delete ───────────────────────────────────────────────────────────────

  /**
   * Execute a `DELETE`.
   *
   * ```ts
   * const { rowCount } = await userClient.delete({ where: { id: "usr_1" } });
   * ```
   */
  async delete(options: DeleteOptions<Cols>): Promise<PgDeleteResult<T>> {
    const { sql, json } = this.accessor.delete(options);
    return pgDelete<T>(this._conn, sql, json as DeleteDescriptor, this._logger);
  }

  // ─── upsert ───────────────────────────────────────────────────────────

  async upsert(options: UpsertOptions<Cols>): Promise<PgInsertResult<T>> {
    const { sql, json } = this.accessor.upsert(options);
    return pgInsert<T>(this._conn, sql, json as UpsertDescriptor, this._logger);
  }

  // ─── transaction ──────────────────────────────────────────────────────────

  /**
   * Run a callback inside a single pg transaction.
   *
   * Commits on success, rolls back on any thrown error.
   * The `PgModelClient` passed to the callback is bound to the transaction
   * client — all queries within the callback run inside the transaction.
   *
   * ```ts
   * await userClient.transaction(async (tx) => {
   *   await tx.create({ data: { id: "usr_1", email: "a@b.com", name: "Alice" } });
   *   await tx.update({ set: { verified: true }, where: { id: "usr_1" } });
   * });
   * ```
   */
  async transaction<R>(
    callback: (tx: PgModelClient<T, Cols>) => Promise<R>,
  ): Promise<R> {
    return pgTransaction(this._pool, async (client) => {
      const tx = this.withClient(client);
      return callback(tx);
    }, this._logger);
  }

  // ─── withClient ───────────────────────────────────────────────────────────

  /**
   * Return a new `PgModelClient` that routes queries through a specific
   * `PoolClient` rather than the pool.
   *
   * Useful when combining multiple models inside a shared transaction:
   * ```ts
   * await pgTransaction(pool, async (client) => {
   *   const userTx  = userClient.withClient(client);
   *   const orderTx = orderClient.withClient(client);
   *   await userTx.create({ data: { ... } });
   *   await orderTx.create({ data: { ... } });
   * });
   * ```
   */
  withClient(client: PoolClient): PgModelClient<T, Cols> {
    return new PgModelClient<T, Cols>(
      (this.accessor as unknown as { _model: ModelDefinition })._model,
      this._pool,
      client,
      this._logger,
    );
  }
}
