import { ModelDefinition } from "@/schema/model";
import { BuiltQuery, SelectDescriptor } from "./types";
import { assembleQuery, quoteIdent } from "./helpers";
import { QueryBase } from "./base";

// ─── SelectBuilder ────────────────────────────────────────────────────────────

/**
 * Fluent builder for `SELECT` queries.
 *
 * ### Usage
 * ```ts
 * const q = new SelectBuilder(UserSchema)
 *   .columns(["id", "email", "name"])
 *   .where({ verified: true, age: { gte: 18 } })
 *   .orderBy("name", "ASC")
 *   .limit(20)
 *   .offset(40)
 *   .generateSql();
 *
 * // q.sql    → SELECT "id", "email", "name" FROM "store"."user"
 * //            WHERE "verified" = $1 AND "age" >= $2
 * //            ORDER BY "name" ASC
 * //            LIMIT 20 OFFSET 40
 * // q.params → [true, 18]
 * ```
 *
 * ### Generic column-name narrowing (with codegen)
 * ```ts
 * type UserCols = "id" | "email" | "name" | "age" | "verified" | "created_at" | "updated_at";
 * const q = new SelectBuilder<UserCols>(UserSchema);
 * q.columns(["id", "typo"]);  // ← TypeScript error — "typo" not assignable to UserCols
 * ```
 *
 * ### Standalone usage pattern
 * ```ts
 * const user = { select: new SelectBuilder(UserSchema) };
 * const q = user.select.columns(["id"]).where({ id: "usr_1" }).generateSql();
 * ```
 */
export class SelectBuilder<
  Cols extends string = string,
> extends QueryBase<Cols> {
  private _cols: string[] = []; // empty → SELECT *
  private _distinct = false;
  private _limit?: number;
  private _offset?: number;

  constructor(model: ModelDefinition) {
    super(model);
  }

  // ─── Column selection ──────────────────────────────────────────────────────

  /**
   * Choose which columns to return.
   *
   * Every name is validated against the model's schema.  Calling with an empty
   * array (or not calling at all) produces `SELECT *`.
   *
   * ```ts
   * .columns(["id", "email", "name"])
   * ```
   */
  columns(cols: Cols[]): this {
    this._assertColList(cols as string[], "select.columns");
    this._cols = cols as string[];
    return this;
  }

  // ─── DISTINCT ──────────────────────────────────────────────────────────────

  /**
   * Add `DISTINCT` to the SELECT keyword.
   * ```ts
   * .distinct()
   * ```
   */
  distinct(): this {
    this._distinct = true;
    return this;
  }

  // ─── LIMIT / OFFSET ────────────────────────────────────────────────────────

  /**
   * Limit the number of returned rows.
   * ```ts
   * .limit(10)
   * ```
   */
  limit(n: number): this {
    if (!Number.isInteger(n) || n < 0)
      throw new Error(
        `[query:select.limit] Expected non-negative integer, got ${n}`,
      );
    this._limit = n;
    return this;
  }

  /**
   * Skip the first N rows.
   * ```ts
   * .offset(20)
   * ```
   */
  offset(n: number): this {
    if (!Number.isInteger(n) || n < 0)
      throw new Error(
        `[query:select.offset] Expected non-negative integer, got ${n}`,
      );
    this._offset = n;
    return this;
  }

  // ─── generateSql ──────────────────────────────────────────────────────────

  /**
   * Compile the builder state into a parameterised `{ sql, params }` object.
   *
   * ```ts
   * const { sql, params } = new SelectBuilder(UserSchema)
   *   .columns(["id"])
   *   .where({ id: "usr_1" })
   *   .generateSql();
   * ```
   */
  generateSql(): BuiltQuery {
    const params: unknown[] = [];

    const keyword = this._distinct ? "SELECT DISTINCT" : "SELECT";
    const colList =
      this._cols.length > 0 ? this._cols.map(quoteIdent).join(", ") : "*";

    const parts = [
      `${keyword} ${colList}`,
      `FROM ${this._table()}`,
      this._buildWhere(params),
      this._buildOrderBy(),
      this._limit !== undefined ? `LIMIT ${this._limit}` : "",
      this._offset !== undefined ? `OFFSET ${this._offset}` : "",
    ];

    return assembleQuery(parts, params);
  }

  // ─── generateJson ─────────────────────────────────────────────────────────

  /**
   * Produce a structured `SelectDescriptor` describing this query without
   * generating a SQL string.
   *
   * ```ts
   * const json = new SelectBuilder(UserSchema)
   *   .columns(["id", "email"])
   *   .where({ verified: true })
   *   .generateJson();
   * // json.type    → "select"
   * // json.columns → ["id", "email"]
   * // json.where   → [{ verified: true }]
   * ```
   */
  generateJson(): SelectDescriptor {
    const desc: SelectDescriptor = {
      type: "select",
      table: this._tableRef.name,
      columns: [...this._cols],
      where: this._whereClauses.map((c) => ({
        ...c,
      })) as SelectDescriptor["where"],
      whereRaw: this._rawWhereClauses.map((c) => ({ ...c })),
      orderBy: this._orderByClauses.map((c) => ({ ...c })),
      distinct: this._distinct,
    };
    if (this._tableRef.schema !== undefined)
      desc.schema = this._tableRef.schema;
    if (this._limit !== undefined) desc.limit = this._limit;
    if (this._offset !== undefined) desc.offset = this._offset;
    return desc;
  }
}
