import { ModelDefinition } from "@damatjs/orm-model";
import { BuiltQuery, UpdateDescriptor, ValuesMap } from "./types";
import { assembleQuery, quoteIdent } from "./helpers";
import { QueryBase } from "./base";

export class UpdateBuilder<Cols extends string = string> extends QueryBase<Cols> {
  private _set: ValuesMap<Cols> = {};
  private _allowFullTable = false;

  constructor(model: ModelDefinition) {
    super(model);
  }

  set(values: ValuesMap<Cols>): this {
    this._assertCols(values as Record<string, unknown>, "update.set");
    this._set = { ...this._set, ...values };
    return this;
  }

  allowFullTable(): this {
    this._allowFullTable = true;
    return this;
  }

  generateSql(): BuiltQuery {
    if (Object.keys(this._set).length === 0) {
      throw new Error("[query:update] No columns to update — call .set() before .generateSql()");
    }

    const hasWhere = this._whereClauses.length > 0 || this._rawWhereClauses.length > 0;
    if (!hasWhere && !this._allowFullTable) {
      throw new Error(
        "[query:update] No WHERE clause — this would update every row. " +
        "Add .where() or call .allowFullTable() to opt-in.",
      );
    }

    const params: unknown[] = [];
    const setFragments = Object.entries(this._set as Record<string, unknown>).map(([col, val]) => {
      params.push(val);
      return `${quoteIdent(col)} = $${params.length}`;
    });

    const parts = [
      `UPDATE ${this._table()}`,
      `SET ${setFragments.join(", ")}`,
      this._buildWhere(params),
      this._buildOrderBy(),
      this._buildReturning(),
    ];

    return assembleQuery(parts, params);
  }

  generateJson(): UpdateDescriptor {
    const desc: UpdateDescriptor = {
      type: "update",
      table: this._tableRef.name,
      set: { ...(this._set as Record<string, unknown>) },
      where: this._whereClauses.map((c) => ({ ...c })) as UpdateDescriptor["where"],
      whereRaw: this._rawWhereClauses.map((c) => ({ ...c })),
      orderBy: this._orderByClauses.map((c) => ({ ...c })),
      returning: [...this._returningCols],
    };
    if (this._tableRef.schema !== undefined) desc.schema = this._tableRef.schema;
    return desc;
  }
}
