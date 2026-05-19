import { ModelDefinition } from "@damatjs/orm-model";
import { BuiltQuery, SelectDescriptor } from "../types";
import { assembleQuery, quoteIdent } from "../helpers";
import { QueryBase } from "../base";
import { RelationIncludeMap, RelationIncludeOptions, assertValidRelationMap, resolveModelRelations } from "../relations";
import { buildLateralJoin } from "./lateral";
import { buildSelectJson } from "./json";

export class SelectBuilder<Cols extends string = string> extends QueryBase<Cols> {
  _cols: string[] = [];
  _distinct = false;
  _limit?: number;
  _offset?: number;
  _withRelations: Map<string, RelationIncludeOptions> = new Map();
  protected readonly _model: ModelDefinition;

  constructor(model: ModelDefinition) {
    super(model);
    this._model = model;
  }

  columns(cols: Cols[]): this {
    this._assertColList(cols as string[], "select.columns");
    this._cols = cols as string[];
    return this;
  }

  distinct(): this {
    this._distinct = true;
    return this;
  }

  limit(n: number): this {
    if (!Number.isInteger(n) || n < 0) throw new Error(`[query:select.limit] Expected non-negative integer, got ${n}`);
    this._limit = n;
    return this;
  }

  offset(n: number): this {
    if (!Number.isInteger(n) || n < 0) throw new Error(`[query:select.offset] Expected non-negative integer, got ${n}`);
    this._offset = n;
    return this;
  }

  with(relations: RelationIncludeMap): this {
    assertValidRelationMap(this._model, relations);
    for (const [name, opts] of Object.entries(relations)) {
      if (opts === false) continue;
      this._withRelations.set(name, opts === true ? {} : opts);
    }
    return this;
  }

  generateSql(): BuiltQuery {
    const params: unknown[] = [];
    const hasRelations = this._withRelations.size > 0;
    const parentAlias = `_p`;
    const parentRef = hasRelations ? `${this._table()} ${quoteIdent(parentAlias)}` : this._table();

    let colList: string;
    const plainCols = this._cols.map((c) => hasRelations ? `${quoteIdent(parentAlias)}.${quoteIdent(c)}` : quoteIdent(c));
    const relCols = [...this._withRelations.keys()].map((name) => `${quoteIdent(`_rel_${name}`)}.${quoteIdent(name)}`);

    if (this._cols.length > 0) {
      colList = (hasRelations ? [...plainCols, ...relCols] : plainCols).join(", ");
    } else {
      colList = hasRelations ? [`${quoteIdent(parentAlias)}.*`, ...relCols].join(", ") : "*";
    }

    const lateralJoins: string[] = [];
    if (hasRelations) {
      const resolved = resolveModelRelations(this._model);
      for (const [relName, relOpts] of this._withRelations) {
        const res = resolved.get(relName);
        if (res) lateralJoins.push(buildLateralJoin(relName, res, relOpts, parentAlias, params));
      }
    }

    const parts = [
      `${this._distinct ? "SELECT DISTINCT" : "SELECT"} ${colList}`,
      `FROM ${parentRef}`,
      ...lateralJoins,
      this._buildWhere(params),
      this._buildOrderBy(),
      this._limit !== undefined ? `LIMIT ${this._limit}` : "",
      this._offset !== undefined ? `OFFSET ${this._offset}` : "",
    ];
    return assembleQuery(parts, params);
  }

  generateJson(): SelectDescriptor {
    return buildSelectJson(this);
  }
}
