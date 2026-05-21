import { ModelDefinition } from "@damatjs/orm-model";
import { BuiltQuery, UpsertDescriptor, ValuesMap } from "./types";
import { assembleQuery, quoteIdent } from "./helpers";
import { QueryBase } from "./base";

export class UpsertBuilder<Cols extends string = string> extends QueryBase<Cols> {
  private _rows: ValuesMap<Cols>[] = [];
  private _conflictColumns: Cols[] = [];
  private _updateColumns?: Cols[];
  private _set?: ValuesMap<Cols>;

  constructor(model: ModelDefinition) { super(model); }

  values(input: ValuesMap<Cols> | ValuesMap<Cols>[]): this {
    const rows = Array.isArray(input) ? input : [input];
    if (rows.length === 0) return this;
    for (const r of rows) this._assertCols(r as Record<string, unknown>, "upsert.values");
    this._rows = rows;
    return this;
  }

  onConflict(conflictColumns: Cols[]): this {
    this._assertColList(conflictColumns as string[], "upsert.onConflict.conflictColumns");
    this._conflictColumns = conflictColumns;
    return this;
  }

  updateColumns(columns: Cols[]): this {
    this._assertColList(columns as string[], "upsert.updateColumns");
    this._updateColumns = columns;
    return this;
  }

  set(values: ValuesMap<Cols>): this {
    this._assertCols(values as Record<string, unknown>, "upsert.set");
    this._set = values;
    return this;
  }

  generateSql(): BuiltQuery {
    if (this._rows.length === 0) throw new Error("[query:upsert] No values provided");
    if (this._conflictColumns.length === 0) throw new Error("[query:upsert] No conflict columns specified");

    const params: unknown[] = [];
    const colNames = Object.keys(this._rows[0]!);
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
      `INSERT INTO ${this._table()} (${colNames.map(quoteIdent).join(", ")})`,
      `VALUES ${valueTuples.join(", ")}`,
      `ON CONFLICT ${conflictTarget} DO UPDATE SET ${setFragments.join(", ")}`,
      this._buildReturning(),
    ];
    return assembleQuery(parts, params);
  }

  generateJson(): UpsertDescriptor {
    const desc: UpsertDescriptor = {
      type: "upsert",
      table: this._tableRef.name,
      rows: this._rows.map((r) => ({ ...(r as Record<string, unknown>) })),
      conflictColumns: [...this._conflictColumns],
      returning: [...this._returningCols],
    };
    if (this._tableRef.schema !== undefined) desc.schema = this._tableRef.schema;
    if (this._updateColumns !== undefined) desc.updateColumns = [...this._updateColumns];
    if (this._set !== undefined) desc.set = { ...(this._set as Record<string, unknown>) };
    return desc;
  }

  private _buildSetFragments(insertedColNames: string[], params: unknown[]): string[] {
    const conflictSet = new Set(this._conflictColumns as string[]);
    const explicitSet = this._set as Record<string, unknown> | undefined;
    const explicitKeys = explicitSet ? new Set(Object.keys(explicitSet)) : new Set<string>();

    let excludedCols: string[];
    if (this._updateColumns !== undefined) {
      excludedCols = (this._updateColumns as string[]).filter((c) => !explicitKeys.has(c));
    } else {
      excludedCols = insertedColNames.filter((c) => !conflictSet.has(c) && !explicitKeys.has(c));
    }

    return [
      ...excludedCols.map((col) => `${quoteIdent(col)} = EXCLUDED.${quoteIdent(col)}`),
      ...Object.entries(explicitSet ?? {}).map(([col, val]) => {
        params.push(val);
        return `${quoteIdent(col)} = $${params.length}`;
      }),
    ];
  }
}
