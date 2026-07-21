import { ModelDefinition } from "@damatjs/orm-model";
import { BuiltQuery, InsertDescriptor, ValuesMap } from "../types";
import { assembleQuery, quoteIdent } from "../helpers";
import { QueryBase } from "../base";
import type { OnConflictClause } from "./conflict";
import { buildOnConflictSql } from "./conflict";

export class InsertBuilder<
  Cols extends string = string,
> extends QueryBase<Cols> {
  private _rows: ValuesMap<Cols>[] = [];
  private _onConflict?: OnConflictClause<Cols>;

  constructor(model: ModelDefinition) {
    super(model);
  }

  values(input: ValuesMap<Cols> | ValuesMap<Cols>[]): this {
    const rows = Array.isArray(input) ? input : [input];
    if (rows.length === 0) return this;
    for (const row of rows) {
      this._assertCols(row as Record<string, unknown>, "insert.values");
    }
    this._rows = rows;
    return this;
  }

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
      ? buildOnConflictSql(this._onConflict as any, params)
      : "";
    const parts = [
      `INSERT INTO ${this._table()} (${quotedCols})`,
      `VALUES ${valueTuples.join(", ")}`,
      conflictClause,
      this._buildReturning(),
    ];

    return assembleQuery(parts, params);
  }

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
