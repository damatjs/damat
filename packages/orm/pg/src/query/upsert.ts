import { ModelDefinition } from "@damatjs/orm-model";
import { BuiltQuery, UpsertDescriptor, ValuesMap } from "./types";
import { assembleQuery, quoteIdent } from "./helpers";
import { QueryBase } from "./base";

// ─── UpsertBuilder ────────────────────────────────────────────────────────────

/**
 * Fluent builder for `INSERT INTO … ON CONFLICT … DO UPDATE SET … RETURNING …`
 * queries (commonly called "upsert").
 *
 * Unlike using `InsertBuilder.onConflict({ action: "update" })` directly, this
 * builder surfaces upsert as a first-class operation with dedicated, ergonomic
 * methods that are easier to discover and use correctly.
 *
 * ### Single-row upsert
 * ```ts
 * const q = new UpsertBuilder(UserSchema)
 *   .values({ id: "usr_1", email: "a@b.com", name: "Alice" })
 *   .onConflict(["email"])
 *   .returning(["id", "email"])
 *   .generateSql();
 *
 * // q.sql    → INSERT INTO "store"."user" ("id", "email", "name")
 * //            VALUES ($1, $2, $3)
 * //            ON CONFLICT ("email") DO UPDATE SET
 * //              "id" = EXCLUDED."id", "name" = EXCLUDED."name"
 * //            RETURNING "id", "email"
 * // q.params → ["usr_1", "a@b.com", "Alice"]
 * ```
 *
 * ### Only update specific columns on conflict
 * ```ts
 * new UpsertBuilder(UserSchema)
 *   .values({ id: "usr_1", email: "a@b.com", name: "Alice" })
 *   .onConflict(["email"])
 *   .updateColumns(["name"])
 *   .generateSql();
 * ```
 *
 * ### Explicit SET overrides on conflict
 * ```ts
 * new UpsertBuilder(UserSchema)
 *   .values({ id: "usr_1", email: "a@b.com", name: "Alice" })
 *   .onConflict(["email"])
 *   .set({ name: "Alice Updated", updated_at: new Date() })
 *   .generateSql();
 * ```
 *
 * ### Bulk upsert
 * ```ts
 * new UpsertBuilder(UserSchema)
 *   .values([
 *     { id: "usr_1", email: "a@b.com", name: "Alice" },
 *     { id: "usr_2", email: "b@b.com", name: "Bob" },
 *   ])
 *   .onConflict(["email"])
 *   .generateSql();
 * ```
 *
 * ### Generic column-name narrowing (with codegen)
 * ```ts
 * type UserCols = "id" | "email" | "name" | "verified" | "created_at" | "updated_at";
 * const q = new UpsertBuilder<UserCols>(UserSchema);
 * q.values({ id: "usr_1", bogus: 1 }); // ← TypeScript error
 * ```
 */
export class UpsertBuilder<
  Cols extends string = string,
> extends QueryBase<Cols> {
  private _rows: ValuesMap<Cols>[] = [];
  private _conflictColumns: Cols[] = [];
  private _updateColumns?: Cols[];
  private _set?: ValuesMap<Cols>;

  constructor(model: ModelDefinition) {
    super(model);
  }

  // ─── Values ───────────────────────────────────────────────────────────────

  /**
   * Provide the row(s) to insert / update.
   *
   * All keys are validated against the model's column list.  For a bulk
   * upsert, every row must contain the same set of columns (the first row's
   * keys define the column list for the VALUES clause).
   *
   * ```ts
   * // single
   * .values({ id: "usr_1", email: "a@b.com", name: "Alice" })
   *
   * // bulk
   * .values([
   *   { id: "usr_1", email: "a@b.com", name: "Alice" },
   *   { id: "usr_2", email: "b@b.com", name: "Bob" },
   * ])
   * ```
   */
  values(row: ValuesMap<Cols>): this;
  values(rows: ValuesMap<Cols>[]): this;
  values(input: ValuesMap<Cols> | ValuesMap<Cols>[]): this {
    const rows = Array.isArray(input) ? input : [input];
    if (rows.length === 0) return this;
    for (const row of rows) {
      this._assertCols(row as Record<string, unknown>, "upsert.values");
    }
    this._rows = rows;
    return this;
  }

  // ─── ON CONFLICT ──────────────────────────────────────────────────────────

  /**
   * Specify the unique-constraint column(s) that define the conflict target.
   *
   * This call is **required** — `generateSql()` will throw if no conflict
   * columns are set.
   *
   * ```ts
   * .onConflict(["email"])
   * .onConflict(["tenant_id", "slug"])
   * ```
   */
  onConflict(conflictColumns: Cols[]): this {
    this._assertColList(
      conflictColumns as string[],
      "upsert.onConflict.conflictColumns",
    );
    this._conflictColumns = conflictColumns;
    return this;
  }

  // ─── updateColumns ────────────────────────────────────────────────────────

  /**
   * Limit the columns that are updated when a conflict is detected.
   *
   * When provided, only the listed columns are touched via
   * `EXCLUDED.<col>` — all other inserted columns are left as-is.
   *
   * When omitted, every inserted column except the conflict columns
   * is updated automatically.
   *
   * ```ts
   * .onConflict(["email"]).updateColumns(["name", "updated_at"])
   * ```
   */
  updateColumns(columns: Cols[]): this {
    this._assertColList(columns as string[], "upsert.updateColumns");
    this._updateColumns = columns;
    return this;
  }

  // ─── set ──────────────────────────────────────────────────────────────────

  /**
   * Provide explicit column → value pairs for the `DO UPDATE SET` clause.
   *
   * When supplied, these override `updateColumns` / `EXCLUDED` fallback for
   * the keys they specify.  You may combine both: unlisted columns still fall
   * back to `EXCLUDED.<col>`.
   *
   * ```ts
   * .onConflict(["email"]).set({ name: "Alice", updated_at: new Date() })
   * ```
   */
  set(values: ValuesMap<Cols>): this {
    this._assertCols(values as Record<string, unknown>, "upsert.set");
    this._set = values;
    return this;
  }

  // ─── generateSql ──────────────────────────────────────────────────────────

  generateSql(): BuiltQuery {
    if (this._rows.length === 0) {
      throw new Error(
        "[query:upsert] No values provided — call .values() before .generateSql()",
      );
    }
    if (this._conflictColumns.length === 0) {
      throw new Error(
        "[query:upsert] No conflict columns specified — call .onConflict() before .generateSql()",
      );
    }

    const params: unknown[] = [];
    const colNames = Object.keys(this._rows[0]!);
    const quotedCols = colNames.map(quoteIdent).join(", ");

    const valueTuples = this._rows.map((row) => {
      const ph = colNames.map((col) => {
        params.push((row as Record<string, unknown>)[col]);
        return `$${params.length}`;
      });
      return `(${ph.join(", ")})`;
    });

    const conflictTarget = `(${this._conflictColumns.map(quoteIdent).join(", ")})`;

    const setFragments = this._buildSetFragments(colNames, params);

    const parts = [
      `INSERT INTO ${this._table()} (${quotedCols})`,
      `VALUES ${valueTuples.join(", ")}`,
      `ON CONFLICT ${conflictTarget} DO UPDATE SET ${setFragments.join(", ")}`,
      this._buildReturning(),
    ];

    return assembleQuery(parts, params);
  }

  // ─── generateJson ─────────────────────────────────────────────────────────

  /**
   * Produce a structured `UpsertDescriptor` describing this query without
   * generating a SQL string.
   *
   * ```ts
   * const json = new UpsertBuilder(UserSchema)
   *   .values({ id: "usr_1", email: "a@b.com", name: "Alice" })
   *   .onConflict(["email"])
   *   .generateJson();
   * // json.type            → "upsert"
   * // json.conflictColumns → ["email"]
   * ```
   */
  generateJson(): UpsertDescriptor {
    const desc: UpsertDescriptor = {
      type: "upsert",
      table: this._tableRef.name,
      rows: this._rows.map((r) => ({ ...(r as Record<string, unknown>) })),
      conflictColumns: [...this._conflictColumns],
      returning: [...this._returningCols],
    };
    if (this._tableRef.schema !== undefined)
      desc.schema = this._tableRef.schema;
    if (this._updateColumns !== undefined)
      desc.updateColumns = [...this._updateColumns];
    if (this._set !== undefined)
      desc.set = { ...(this._set as Record<string, unknown>) };
    return desc;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * Build the `SET` fragment list for `DO UPDATE SET`.
   *
   * Priority (highest to lowest):
   * 1. Explicit `.set()` overrides for their specific keys.
   * 2. `.updateColumns()` — use `EXCLUDED.<col>` for those columns.
   * 3. Default — use `EXCLUDED.<col>` for every inserted column that is
   *    not part of the conflict target.
   */
  private _buildSetFragments(
    insertedColNames: string[],
    params: unknown[],
  ): string[] {
    const conflictSet = new Set(this._conflictColumns as string[]);
    const explicitSet = this._set as Record<string, unknown> | undefined;
    const explicitKeys = explicitSet
      ? new Set(Object.keys(explicitSet))
      : new Set<string>();

    // Determine which columns receive EXCLUDED fallback
    let excludedCols: string[];
    if (this._updateColumns !== undefined) {
      excludedCols = (this._updateColumns as string[]).filter(
        (c) => !explicitKeys.has(c),
      );
    } else {
      // Default: every inserted column except conflict columns and explicit-set keys
      excludedCols = insertedColNames.filter(
        (c) => !conflictSet.has(c) && !explicitKeys.has(c),
      );
    }

    const fragments: string[] = [
      // EXCLUDED fallback columns
      ...excludedCols.map(
        (col) => `${quoteIdent(col)} = EXCLUDED.${quoteIdent(col)}`,
      ),
      // Explicit SET overrides
      ...Object.entries(explicitSet ?? {}).map(([col, val]) => {
        params.push(val);
        return `${quoteIdent(col)} = $${params.length}`;
      }),
    ];

    return fragments;
  }
}
