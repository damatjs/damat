import { ModelDefinition } from "@/schema/model";
import {
  BuiltQuery,
  DeleteDescriptor,
  InsertDescriptor,
  OrderDirection,
  QueryDescriptor,
  RawWhereClause,
  SelectDescriptor,
  UpdateDescriptor,
  ValuesMap,
  WhereClause,
} from "./types";
import { OnConflictClause } from "./insert";
import { SelectBuilder } from "./select";
import { InsertBuilder } from "./insert";
import { UpdateBuilder } from "./update";
import { DeleteBuilder } from "./delete";

// ─── Option bag types ─────────────────────────────────────────────────────────

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
}

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

// ─── Each method can return SQL or JSON ───────────────────────────────────────

/** The output of every accessor method — both representations available. */
export interface QueryResult<D extends QueryDescriptor> {
  /** Parameterised SQL ready for a database driver. */
  sql: BuiltQuery;
  /** Structured JSON descriptor for inspection / transformation. */
  json: D;
}

// ─── ModelAccessor ────────────────────────────────────────────────────────────

/**
 * Ergonomic, Prisma-style accessor bound to a single `ModelDefinition`.
 *
 * Each method takes a plain options object and returns a `{ sql, json }`
 * pair — both the parameterised SQL and the structured descriptor are
 * always available at once.
 *
 * ### Setup
 * ```ts
 * import { ModelAccessor } from "@damatjs/orm-model";
 *
 * const user = new ModelAccessor(UserSchema);
 * const order = new ModelAccessor(OrderSchema);
 * ```
 *
 * ### findMany
 * ```ts
 * const { sql, json } = user.findMany({
 *   select: ["id", "email", "name"],
 *   where: { verified: true, age: { gte: 18 } },
 *   orderBy: [{ column: "name", direction: "ASC" }],
 *   limit: 20,
 * });
 * // sql.sql    → SELECT "id", "email", "name" FROM "store"."user"
 * //              WHERE "verified" = $1 AND "age" >= $2
 * //              ORDER BY "name" ASC LIMIT 20
 * // sql.params → [true, 18]
 * // json.type  → "select"
 * ```
 *
 * ### findOne
 * ```ts
 * const { sql } = user.findOne({ where: { id: "usr_1" } });
 * // Identical to findMany but LIMIT 1 is automatically applied.
 * ```
 *
 * ### create
 * ```ts
 * const { sql } = user.create({
 *   data: { id: "usr_1", email: "a@b.com", name: "Alice" },
 *   returning: ["id", "email"],
 * });
 * ```
 *
 * ### createMany
 * ```ts
 * const { sql } = user.createMany({
 *   data: [{ id: "usr_1", email: "a@b.com" }, { id: "usr_2", email: "b@c.com" }],
 * });
 * ```
 *
 * ### update
 * ```ts
 * const { sql } = user.update({
 *   set: { verified: true },
 *   where: { email: "a@b.com" },
 *   returning: ["id"],
 * });
 * ```
 *
 * ### delete
 * ```ts
 * const { sql } = user.delete({ where: { id: "usr_1" } });
 * ```
 *
 * ### Generic column narrowing (with codegen)
 * ```ts
 * type UserCols = "id" | "email" | "name" | "verified" | "created_at" | "updated_at";
 * const user = new ModelAccessor<UserCols>(UserSchema);
 *
 * user.findMany({ select: ["id", "typo"] }); // ← TypeScript error
 * ```
 *
 * ### Raw builders still available
 * Access the underlying builders directly for advanced use:
 * ```ts
 * user.builders.select
 *   .columns(["id"])
 *   .where({ verified: true })
 *   .distinct()
 *   .generateSql();
 * ```
 */
export class ModelAccessor<Cols extends string = string> {
  private readonly _model: ModelDefinition;

  /**
   * Direct access to the underlying query builders for advanced usage.
   * Each property returns a **fresh** builder instance.
   */
  readonly builders: {
    get select(): SelectBuilder<Cols>;
    get insert(): InsertBuilder<Cols>;
    get update(): UpdateBuilder<Cols>;
    get delete(): DeleteBuilder<Cols>;
  };

  constructor(model: ModelDefinition) {
    this._model = model;

    const self = this;
    this.builders = {
      get select() {
        return new SelectBuilder<Cols>(self._model);
      },
      get insert() {
        return new InsertBuilder<Cols>(self._model);
      },
      get update() {
        return new UpdateBuilder<Cols>(self._model);
      },
      get delete() {
        return new DeleteBuilder<Cols>(self._model);
      },
    };
  }

  // ─── findMany ─────────────────────────────────────────────────────────────

  /**
   * Build a SELECT query that may return multiple rows.
   *
   * ```ts
   * const { sql, json } = user.findMany({
   *   select: ["id", "email"],
   *   where: { verified: true },
   *   orderBy: [{ column: "name", direction: "ASC" }],
   *   limit: 10,
   * });
   * ```
   */
  findMany(options: FindOptions<Cols> = {}): QueryResult<SelectDescriptor> {
    const b = new SelectBuilder<Cols>(this._model);
    this._applyFindOptions(b, options);
    return { sql: b.generateSql(), json: b.generateJson() };
  }

  // ─── findOne ──────────────────────────────────────────────────────────────

  /**
   * Build a SELECT query that returns at most one row (LIMIT 1 is implicit).
   *
   * ```ts
   * const { sql } = user.findOne({ where: { id: "usr_1" } });
   * ```
   */
  findOne(
    options: Omit<FindOptions<Cols>, "limit" | "offset"> = {},
  ): QueryResult<SelectDescriptor> {
    const b = new SelectBuilder<Cols>(this._model);
    this._applyFindOptions(b, options);
    b.limit(1);
    return { sql: b.generateSql(), json: b.generateJson() };
  }

  // ─── create ───────────────────────────────────────────────────────────────

  /**
   * Build an INSERT query for a single row.
   *
   * ```ts
   * const { sql } = user.create({
   *   data: { id: "usr_1", email: "a@b.com", name: "Alice" },
   *   returning: ["id"],
   * });
   * ```
   */
  create(options: CreateOptions<Cols>): QueryResult<InsertDescriptor> {
    const b = new InsertBuilder<Cols>(this._model);
    b.values(options.data);
    if (options.returning) b.returning(options.returning);
    if (options.onConflict) b.onConflict(options.onConflict);
    return { sql: b.generateSql(), json: b.generateJson() };
  }

  // ─── createMany ───────────────────────────────────────────────────────────

  /**
   * Build a bulk INSERT query.
   *
   * ```ts
   * const { sql } = user.createMany({
   *   data: [{ id: "usr_1", email: "a@b.com" }, { id: "usr_2", email: "b@b.com" }],
   * });
   * ```
   */
  createMany(options: CreateManyOptions<Cols>): QueryResult<InsertDescriptor> {
    const b = new InsertBuilder<Cols>(this._model);
    b.values(options.data);
    if (options.returning) b.returning(options.returning);
    if (options.onConflict) b.onConflict(options.onConflict);
    return { sql: b.generateSql(), json: b.generateJson() };
  }

  // ─── update ───────────────────────────────────────────────────────────────

  /**
   * Build an UPDATE query.
   *
   * ```ts
   * const { sql } = user.update({
   *   set: { verified: true },
   *   where: { email: "a@b.com" },
   *   returning: ["id", "verified"],
   * });
   * ```
   */
  update(options: UpdateOptions<Cols>): QueryResult<UpdateDescriptor> {
    const b = new UpdateBuilder<Cols>(this._model);
    b.set(options.set);
    if (options.where) b.where(options.where);
    if (options.whereRaw) {
      const raws = Array.isArray(options.whereRaw)
        ? options.whereRaw
        : [options.whereRaw];
      for (const r of raws) b.whereRaw(r);
    }
    if (options.returning) b.returning(options.returning);
    if (options.allowFullTable) b.allowFullTable();
    return { sql: b.generateSql(), json: b.generateJson() };
  }

  // ─── delete ───────────────────────────────────────────────────────────────

  /**
   * Build a DELETE query.
   *
   * ```ts
   * const { sql } = user.delete({ where: { id: "usr_1" } });
   * ```
   */
  delete(options: DeleteOptions<Cols>): QueryResult<DeleteDescriptor> {
    const b = new DeleteBuilder<Cols>(this._model);
    if (options.where) b.where(options.where);
    if (options.whereRaw) {
      const raws = Array.isArray(options.whereRaw)
        ? options.whereRaw
        : [options.whereRaw];
      for (const r of raws) b.whereRaw(r);
    }
    if (options.returning) b.returning(options.returning);
    if (options.allowFullTable) b.allowFullTable();
    return { sql: b.generateSql(), json: b.generateJson() };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private _applyFindOptions(
    b: SelectBuilder<Cols>,
    options: FindOptions<Cols>,
  ): void {
    if (options.select) b.columns(options.select);
    if (options.where) b.where(options.where);
    if (options.whereRaw) {
      const raws = Array.isArray(options.whereRaw)
        ? options.whereRaw
        : [options.whereRaw];
      for (const r of raws) b.whereRaw(r);
    }
    if (options.orderBy) {
      for (const o of options.orderBy)
        b.orderBy(o.column, o.direction, o.nulls);
    }
    if (options.limit !== undefined) b.limit(options.limit);
    if (options.offset !== undefined) b.offset(options.offset);
    if (options.distinct) b.distinct();
  }
}
