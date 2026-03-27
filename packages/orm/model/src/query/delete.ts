import { ModelDefinition } from "@/schema/model";
import { BuiltQuery, DeleteDescriptor } from "./types";
import { assembleQuery } from "./helpers";
import { QueryBase } from "./base";

// ─── DeleteBuilder ────────────────────────────────────────────────────────────

/**
 * Fluent builder for `DELETE FROM … WHERE … RETURNING …` queries.
 *
 * ### Usage
 * ```ts
 * const q = new DeleteBuilder(UserSchema)
 *   .where({ id: "usr_1" })
 *   .returning(["id"])
 *   .generateSql();
 *
 * // q.sql    → DELETE FROM "store"."user" WHERE "id" = $1 RETURNING "id"
 * // q.params → ["usr_1"]
 * ```
 *
 * ### Safety
 * `.generateSql()` throws when no WHERE / whereRaw clause is present —
 * preventing accidental full-table deletes.  Opt in with `.allowFullTable()`.
 *
 * ### Standalone usage pattern
 * ```ts
 * const user = { delete: new DeleteBuilder(UserSchema) };
 * const q = user.delete.where({ id: "usr_1" }).generateSql();
 * ```
 *
 * ### Generic column-name narrowing (with codegen)
 * ```ts
 * type UserCols = "id" | "email" | "name" | "created_at" | "updated_at";
 * const q = new DeleteBuilder<UserCols>(UserSchema);
 * q.where({ typo: "x" }); // ← TypeScript error
 * ```
 */
export class DeleteBuilder<
  Cols extends string = string,
> extends QueryBase<Cols> {
  private _allowFullTable = false;

  constructor(model: ModelDefinition) {
    super(model);
  }

  // ─── Safety opt-out ────────────────────────────────────────────────────────

  /**
   * Allow building a DELETE without a WHERE clause (removes all rows).
   *
   * This is intentionally opt-in to prevent accidental full-table deletes.
   */
  allowFullTable(): this {
    this._allowFullTable = true;
    return this;
  }

  // ─── generateSql ──────────────────────────────────────────────────────────

  generateSql(): BuiltQuery {
    const hasWhere =
      this._whereClauses.length > 0 || this._rawWhereClauses.length > 0;

    if (!hasWhere && !this._allowFullTable) {
      throw new Error(
        "[query:delete] No WHERE clause — this would delete every row. " +
          "Add .where() or call .allowFullTable() to opt-in.",
      );
    }

    const params: unknown[] = [];

    const parts = [
      `DELETE FROM ${this._table()}`,
      this._buildWhere(params),
      this._buildReturning(),
    ];

    return assembleQuery(parts, params);
  }

  // ─── generateJson ─────────────────────────────────────────────────────────

  /**
   * Produce a structured `DeleteDescriptor` describing this query without
   * generating a SQL string.
   *
   * ```ts
   * const json = new DeleteBuilder(UserSchema)
   *   .where({ id: "usr_1" })
   *   .generateJson();
   * // json.type  → "delete"
   * // json.where → [{ id: "usr_1" }]
   * ```
   */
  generateJson(): DeleteDescriptor {
    const desc: DeleteDescriptor = {
      type: "delete",
      table: this._tableRef.name,
      where: this._whereClauses.map((c) => ({
        ...c,
      })) as DeleteDescriptor["where"],
      whereRaw: this._rawWhereClauses.map((c) => ({ ...c })),
      returning: [...this._returningCols],
    };
    if (this._tableRef.schema !== undefined)
      desc.schema = this._tableRef.schema;
    return desc;
  }
}
