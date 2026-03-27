import { ColumnSchema } from "@/types";
import { ModelDefinition } from "@/schema/model";
import {
  BuiltQuery,
  OrderByClause,
  OrderDirection,
  QueryDescriptor,
  RawWhereClause,
  WhereClause,
} from "./types";
import {
  TableRef,
  assertKnownColumnList,
  assertKnownColumns,
  buildOrderByClause,
  buildReturningClause,
  buildWhereClause,
  buildTableRef,
  columnNameSet,
} from "./helpers";

// ─── QueryBase ────────────────────────────────────────────────────────────────

/**
 * Abstract base class shared by all four query builders.
 *
 * Responsibilities:
 *   - Accept a `ModelDefinition` and derive everything it needs from it:
 *     the resolved `ColumnSchema[]`, a `TableRef`, and a `Set<string>` of
 *     known column names for runtime validation.
 *   - Provide shared fluent methods that every DML statement needs:
 *     `.where()`, `.whereRaw()`, `.orderBy()`, `.returning()`.
 *   - Declare the abstract `generateSql()` contract that subclasses fulfil.
 *
 * Subclasses:
 *   - `SelectBuilder`  — SELECT … FROM … WHERE … ORDER BY … LIMIT … OFFSET …
 *   - `InsertBuilder`  — INSERT INTO … VALUES … ON CONFLICT … RETURNING …
 *   - `UpdateBuilder`  — UPDATE … SET … WHERE … RETURNING …
 *   - `DeleteBuilder`  — DELETE FROM … WHERE … RETURNING …
 *
 * ### Generic parameter `Cols`
 * `Cols extends string` defaults to `string`, meaning any column name is
 * accepted.  When you have codegen'd column-name types you can narrow it:
 *
 * ```ts
 * type UserCols = "id" | "email" | "name" | "age" | "verified" | "created_at" | "updated_at";
 * const q = new SelectBuilder<UserCols>(UserSchema);
 * //  q.columns(["id", "typo"])  ← TypeScript error — "typo" not in UserCols
 * ```
 */
export abstract class QueryBase<Cols extends string = string> {
  // ── Model metadata ───────────────────────────────────────────────────────
  /** The raw column definitions resolved from the model. */
  protected readonly _resolvedColumns: ColumnSchema[];
  /** Pre-computed set of valid column names (includes auto-columns). */
  protected readonly _knownCols: Set<string>;
  /** Fully-qualified table identifier for SQL output. */
  protected readonly _tableRef: TableRef;

  // ── Shared clause state ──────────────────────────────────────────────────
  protected _whereClauses: WhereClause<Cols>[] = [];
  protected _rawWhereClauses: RawWhereClause[] = [];
  protected _orderByClauses: OrderByClause[] = [];
  protected _returningCols: string[] = [];

  /**
   * @param model  The `ModelDefinition` this query targets.
   *               All column names, types, table name, and schema are derived
   *               from it — no separate arguments needed.
   */
  constructor(model: ModelDefinition) {
    this._resolvedColumns = model.toTableSchema().columns;
    this._knownCols = columnNameSet(this._resolvedColumns);

    const ref: TableRef = { name: model._tableName };
    if (model._schemaName !== undefined) ref.schema = model._schemaName;
    this._tableRef = ref;
  }

  // ─── WHERE ────────────────────────────────────────────────────────────────

  /**
   * Add object-style WHERE conditions (all are AND-ed together).
   *
   * Keys must be valid column names; values can be plain scalars (equality)
   * or operator objects for other comparisons.
   *
   * ```ts
   * .where({ verified: true })
   * .where({ age: { gte: 18 }, status: { in: ["active", "pending"] } })
   * .where({ total: { between: [10, 500] } })
   * .where({ notes: { isNull: true } })
   * ```
   */
  where(clause: WhereClause<Cols>): this {
    this._whereClauses.push(clause);
    return this;
  }

  /**
   * Add a raw SQL WHERE fragment with its own positional parameters.
   *
   * Parameters inside `sql` must be numbered from `$1` — they are
   * automatically re-numbered at build time so they never clash with
   * parameters from other clauses.
   *
   * ```ts
   * .whereRaw({ sql: "lower(email) = lower($1)", params: [email] })
   * .whereRaw({ sql: "created_at > now() - interval $1", params: ["30 days"] })
   * ```
   */
  whereRaw(clause: RawWhereClause): this {
    this._rawWhereClauses.push(clause);
    return this;
  }

  // ─── ORDER BY ─────────────────────────────────────────────────────────────

  /**
   * Append an ORDER BY column.  Can be called multiple times.
   *
   * ```ts
   * .orderBy("created_at", "DESC")
   * .orderBy("name", "ASC", "NULLS LAST")
   * ```
   */
  orderBy(
    column: Cols,
    direction?: OrderDirection,
    nulls?: "NULLS FIRST" | "NULLS LAST",
  ): this {
    assertKnownColumnList([column], this._knownCols, "orderBy");
    const clause: OrderByClause = { column };
    if (direction !== undefined) clause.direction = direction;
    if (nulls !== undefined) clause.nulls = nulls;
    this._orderByClauses.push(clause);
    return this;
  }

  // ─── RETURNING ────────────────────────────────────────────────────────────

  /**
   * Specify which columns to return after a write operation.
   *
   * Omit (or pass `[]`) for `RETURNING *`.
   *
   * ```ts
   * .returning(["id", "created_at"])
   * ```
   */
  returning(cols: Cols[] = []): this {
    assertKnownColumnList(cols as string[], this._knownCols, "returning");
    this._returningCols = cols as string[];
    return this;
  }

  // ─── Internal helpers exposed to subclasses ───────────────────────────────

  /** Build the WHERE fragment (mutates `params`). */
  protected _buildWhere(params: unknown[]): string {
    return buildWhereClause(
      this._whereClauses as WhereClause[],
      this._rawWhereClauses,
      params,
      this._knownCols,
    );
  }

  /** Build the ORDER BY fragment. */
  protected _buildOrderBy(): string {
    return buildOrderByClause(this._orderByClauses);
  }

  /** Build the RETURNING fragment. */
  protected _buildReturning(): string {
    return buildReturningClause(this._returningCols);
  }

  /** Fully-qualified, quoted table reference string. */
  protected _table(): string {
    return buildTableRef(this._tableRef);
  }

  /** Validate a Record's keys against the known column set. */
  protected _assertCols(obj: Record<string, unknown>, ctx: string): void {
    assertKnownColumns(obj, this._knownCols, ctx);
  }

  /** Validate an array of names against the known column set. */
  protected _assertColList(names: string[], ctx: string): void {
    assertKnownColumnList(names, this._knownCols, ctx);
  }

  // ─── Abstract contract ────────────────────────────────────────────────────

  /**
   * Compile the builder state into a parameterised `{ sql, params }` object.
   *
   * This is the terminal operation for the SQL execution path.
   * Pass the result directly to your database driver.
   *
   * ```ts
   * const { sql, params } = new SelectBuilder(UserSchema)
   *   .columns(["id", "email"])
   *   .where({ verified: true })
   *   .generateSql();
   * ```
   */
  abstract generateSql(): BuiltQuery;

  /**
   * Produce a structured, serialisable `QueryDescriptor` object that describes
   * this query without any SQL string generation.
   *
   * Use this when you need to inspect, transform, log, or pass the query
   * intent to a non-SQL layer before it is executed.
   *
   * ```ts
   * const json = new SelectBuilder(UserSchema)
   *   .columns(["id", "email"])
   *   .where({ verified: true })
   *   .generateJson();
   *
   * // json.type    → "select"
   * // json.table   → "user"
   * // json.schema  → "store"
   * // json.columns → ["id", "email"]
   * // json.where   → [{ verified: true }]
   * ```
   */
  abstract generateJson(): QueryDescriptor;
}
