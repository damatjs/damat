import { ModelDefinition } from "@/schema/model";
import { BuiltQuery, UpdateDescriptor, ValuesMap } from "./types";
import { assembleQuery, quoteIdent } from "./helpers";
import { QueryBase } from "./base";

// ─── UpdateBuilder ────────────────────────────────────────────────────────────

/**
 * Fluent builder for `UPDATE … SET … WHERE … RETURNING …` queries.
 *
 * ### Usage
 * ```ts
 * const q = new UpdateBuilder(UserSchema)
 *   .set({ name: "Alice", verified: true })
 *   .where({ id: "usr_1" })
 *   .returning(["id", "name", "updated_at"])
 *   .generateSql();
 *
 * // q.sql    → UPDATE "store"."user"
 * //            SET "name" = $1, "verified" = $2
 * //            WHERE "id" = $3
 * //            RETURNING "id", "name", "updated_at"
 * // q.params → ["Alice", true, "usr_1"]
 * ```
 *
 * ### Safety
 * `.generateSql()` throws when no WHERE / whereRaw clause is present —
 * preventing accidental full-table updates.  Opt in with `.allowFullTable()`.
 *
 * ### Standalone usage pattern
 * ```ts
 * const user = { update: new UpdateBuilder(UserSchema) };
 * const q = user.update
 *   .set({ verified: true })
 *   .where({ email: "a@b.com" })
 *   .generateSql();
 * ```
 *
 * ### Generic column-name narrowing (with codegen)
 * ```ts
 * type UserCols = "id" | "email" | "name" | "verified" | "created_at" | "updated_at";
 * const q = new UpdateBuilder<UserCols>(UserSchema);
 * q.set({ bogus: 1 }); // ← TypeScript error
 * ```
 */
export class UpdateBuilder<
  Cols extends string = string,
> extends QueryBase<Cols> {
  private _set: ValuesMap<Cols> = {};
  private _allowFullTable = false;

  constructor(model: ModelDefinition) {
    super(model);
  }

  // ─── SET ──────────────────────────────────────────────────────────────────

  /**
   * Provide the column → value pairs to update.
   *
   * All keys are validated against the model's column list.  Multiple `.set()`
   * calls are merged — later calls win on duplicate keys.
   *
   * ```ts
   * .set({ name: "Alice", verified: true })
   * .set({ updated_at: new Date() })   // merged into same SET clause
   * ```
   */
  set(values: ValuesMap<Cols>): this {
    this._assertCols(values as Record<string, unknown>, "update.set");
    this._set = { ...this._set, ...values };
    return this;
  }

  // ─── Safety opt-out ────────────────────────────────────────────────────────

  /**
   * Allow building an UPDATE without a WHERE clause (affects all rows).
   *
   * This is intentionally opt-in to prevent accidental full-table updates.
   */
  allowFullTable(): this {
    this._allowFullTable = true;
    return this;
  }

  // ─── generateSql ──────────────────────────────────────────────────────────

  generateSql(): BuiltQuery {
    if (Object.keys(this._set).length === 0) {
      throw new Error(
        "[query:update] No columns to update — call .set() before .generateSql()",
      );
    }

    const hasWhere =
      this._whereClauses.length > 0 || this._rawWhereClauses.length > 0;
    if (!hasWhere && !this._allowFullTable) {
      throw new Error(
        "[query:update] No WHERE clause — this would update every row. " +
          "Add .where() or call .allowFullTable() to opt-in.",
      );
    }

    const params: unknown[] = [];

    // SET clause — params built first so $N numbering starts at 1
    const setFragments = Object.entries(
      this._set as Record<string, unknown>,
    ).map(([col, val]) => {
      params.push(val);
      return `${quoteIdent(col)} = $${params.length}`;
    });

    const parts = [
      `UPDATE ${this._table()}`,
      `SET ${setFragments.join(", ")}`,
      this._buildWhere(params), // WHERE params continue from after SET params
      this._buildOrderBy(),
      this._buildReturning(),
    ];

    return assembleQuery(parts, params);
  }

  // ─── generateJson ─────────────────────────────────────────────────────────

  /**
   * Produce a structured `UpdateDescriptor` describing this query without
   * generating a SQL string.
   *
   * ```ts
   * const json = new UpdateBuilder(UserSchema)
   *   .set({ verified: true })
   *   .where({ id: "usr_1" })
   *   .generateJson();
   * // json.type  → "update"
   * // json.set   → { verified: true }
   * // json.where → [{ id: "usr_1" }]
   * ```
   */
  generateJson(): UpdateDescriptor {
    const desc: UpdateDescriptor = {
      type: "update",
      table: this._tableRef.name,
      set: { ...(this._set as Record<string, unknown>) },
      where: this._whereClauses.map((c) => ({
        ...c,
      })) as UpdateDescriptor["where"],
      whereRaw: this._rawWhereClauses.map((c) => ({ ...c })),
      orderBy: this._orderByClauses.map((c) => ({ ...c })),
      returning: [...this._returningCols],
    };
    if (this._tableRef.schema !== undefined)
      desc.schema = this._tableRef.schema;
    return desc;
  }
}
