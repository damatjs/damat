import { ModelDefinition } from "@damatjs/orm-model";
import { BuiltQuery, DeleteDescriptor } from "./types";
import { assembleQuery } from "./helpers";
import { QueryBase } from "./base";

export class DeleteBuilder<
  Cols extends string = string,
> extends QueryBase<Cols> {
  private _allowFullTable = false;

  constructor(model: ModelDefinition) {
    super(model);
  }

  allowFullTable(): this {
    this._allowFullTable = true;
    return this;
  }

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
