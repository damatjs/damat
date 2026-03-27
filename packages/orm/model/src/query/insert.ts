import { ModelDefinition } from "@/schema/model";
import { BuiltQuery, InsertDescriptor, ValuesMap } from "./types";
import { assembleQuery, quoteIdent } from "./helpers";
import { QueryBase } from "./base";

// ─── ON CONFLICT types ────────────────────────────────────────────────────────

export type OnConflictAction = "nothing" | "update";

/**
 * Configuration for `ON CONFLICT` handling.
 *
 * ```ts
 * // Silently skip duplicate rows
 * .onConflict({ action: "nothing" })
 *
 * // Upsert — update specific columns when a conflict is detected
 * .onConflict({
 *   conflictColumns: ["email"],
 *   action: "update",
 *   set: { name: "Alice", updated_at: new Date() },
 * })
 * ```
 */
export interface OnConflictClause<Cols extends string = string> {
  /** The unique-constraint column(s) that define the conflict target. */
  conflictColumns?: Cols[];
  /** What to do when a conflict is detected. */
  action: OnConflictAction;
  /**
   * `action: "update"` — the column→value pairs to apply on conflict.
   * Omit to fall back to `EXCLUDED.<col>` for every inserted column.
   */
  set?: ValuesMap<Cols>;
}

// ─── InsertBuilder ────────────────────────────────────────────────────────────

/**
 * Fluent builder for `INSERT INTO … VALUES … ON CONFLICT … RETURNING …` queries.
 *
 * ### Single-row insert
 * ```ts
 * const q = new InsertBuilder(OrderSchema)
 *   .values({ id: "ord_1", total: 99.99, status: "pending" })
 *   .returning(["id", "total"])
 *   .generateSql();
 *
 * // q.sql    → INSERT INTO "order" ("id", "total", "status")
 * //            VALUES ($1, $2, $3)
 * //            RETURNING "id", "total"
 * // q.params → ["ord_1", 99.99, "pending"]
 * ```
 *
 * ### Bulk insert
 * ```ts
 * new InsertBuilder(OrderSchema)
 *   .values([
 *     { id: "ord_1", total: 10, status: "pending" },
 *     { id: "ord_2", total: 20, status: "confirmed" },
 *   ])
 *   .generateSql();
 * ```
 *
 * ### Standalone usage pattern
 * ```ts
 * const order = { insert: new InsertBuilder(OrderSchema) };
 * const q = order.insert.values({ id: "ord_1", total: 99 }).generateSql();
 * ```
 *
 * ### Generic column-name narrowing (with codegen)
 * ```ts
 * type OrderCols = "id" | "total" | "status" | "notes" | "placed_at" | "created_at" | "updated_at";
 * const q = new InsertBuilder<OrderCols>(OrderSchema);
 * q.values({ id: "ord_1", bogus: 1 }); // ← TypeScript error
 * ```
 */
export class InsertBuilder<
  Cols extends string = string,
> extends QueryBase<Cols> {
  private _rows: ValuesMap<Cols>[] = [];
  private _onConflict?: OnConflictClause<Cols>;

  constructor(model: ModelDefinition) {
    super(model);
  }

  // ─── Values ───────────────────────────────────────────────────────────────

  /**
   * Provide the row(s) to insert.
   *
   * All keys are validated against the model's column list.  For a bulk insert,
   * every row must contain the same set of columns (the first row's keys define
   * the column list for the VALUES clause).
   *
   * ```ts
   * // single
   * .values({ id: "ord_1", total: 99.99, status: "pending" })
   *
   * // bulk
   * .values([
   *   { id: "ord_1", total: 10, status: "pending" },
   *   { id: "ord_2", total: 20, status: "confirmed" },
   * ])
   * ```
   */
  values(row: ValuesMap<Cols>): this;
  values(rows: ValuesMap<Cols>[]): this;
  values(input: ValuesMap<Cols> | ValuesMap<Cols>[]): this {
    const rows = Array.isArray(input) ? input : [input];
    if (rows.length === 0) return this;
    for (const row of rows) {
      this._assertCols(row as Record<string, unknown>, "insert.values");
    }
    this._rows = rows;
    return this;
  }

  // ─── ON CONFLICT ──────────────────────────────────────────────────────────

  /**
   * Add an `ON CONFLICT` clause.
   *
   * ```ts
   * .onConflict({ action: "nothing" })
   * .onConflict({ conflictColumns: ["email"], action: "update", set: { name: "Alice" } })
   * ```
   */
  onConflict(clause: OnConflictClause<Cols>): this {
    if (clause.conflictColumns) {
      this._assertColList(
        clause.conflictColumns as string[],
        "insert.onConflict.conflictColumns",
      );
    }
    if (clause.action === "update" && clause.set) {
      this._assertCols(
        clause.set as Record<string, unknown>,
        "insert.onConflict.set",
      );
    }
    this._onConflict = clause;
    return this;
  }

  // ─── generateSql ──────────────────────────────────────────────────────────

  generateSql(): BuiltQuery {
    if (this._rows.length === 0) {
      throw new Error(
        "[query:insert] No values provided — call .values() before .generateSql()",
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

    const conflictClause = this._onConflict
      ? buildOnConflictSql(this._onConflict, params)
      : "";

    const parts = [
      `INSERT INTO ${this._table()} (${quotedCols})`,
      `VALUES ${valueTuples.join(", ")}`,
      conflictClause,
      this._buildReturning(),
    ];

    return assembleQuery(parts, params);
  }

  // ─── generateJson ─────────────────────────────────────────────────────────

  /**
   * Produce a structured `InsertDescriptor` describing this query without
   * generating a SQL string.
   *
   * ```ts
   * const json = new InsertBuilder(UserSchema)
   *   .values({ id: "usr_1", email: "a@b.com" })
   *   .generateJson();
   * // json.type  → "insert"
   * // json.rows  → [{ id: "usr_1", email: "a@b.com" }]
   * ```
   */
  generateJson(): InsertDescriptor {
    const desc: InsertDescriptor = {
      type: "insert",
      table: this._tableRef.name,
      rows: this._rows.map((r) => ({ ...(r as Record<string, unknown>) })),
      returning: [...this._returningCols],
    };
    if (this._tableRef.schema !== undefined)
      desc.schema = this._tableRef.schema;
    if (this._onConflict) {
      const oc = this._onConflict;
      desc.onConflict = {
        action: oc.action,
        ...(oc.conflictColumns
          ? { conflictColumns: [...oc.conflictColumns] }
          : {}),
        ...(oc.set ? { set: { ...(oc.set as Record<string, unknown>) } } : {}),
      };
    }
    return desc;
  }
}

// ─── ON CONFLICT SQL builder ──────────────────────────────────────────────────

function buildOnConflictSql(
  clause: OnConflictClause,
  params: unknown[],
): string {
  const target =
    clause.conflictColumns && clause.conflictColumns.length > 0
      ? `(${clause.conflictColumns.map(quoteIdent).join(", ")})`
      : "";

  if (clause.action === "nothing") {
    return `ON CONFLICT ${target} DO NOTHING`.trimEnd();
  }

  // action === "update"
  const set = clause.set as Record<string, unknown> | undefined;
  let setFragments: string[];

  if (set && Object.keys(set).length > 0) {
    setFragments = Object.entries(set).map(([col, val]) => {
      params.push(val);
      return `${quoteIdent(col)} = $${params.length}`;
    });
  } else {
    // No explicit set provided — use EXCLUDED for every column in the target
    const targetCols = clause.conflictColumns ?? [];
    if (targetCols.length > 0) {
      setFragments = targetCols.map(
        (col) => `${quoteIdent(col)} = EXCLUDED.${quoteIdent(col)}`,
      );
    } else {
      // Fallback: generic excluded reference (caller should provide explicit set)
      setFragments = [`"id" = EXCLUDED."id"`];
    }
  }

  return `ON CONFLICT ${target} DO UPDATE SET ${setFragments.join(", ")}`.trimEnd();
}
