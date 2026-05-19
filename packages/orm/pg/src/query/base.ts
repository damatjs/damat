import { ColumnSchema, ModelDefinition } from "@damatjs/orm-model";
import {
  BuiltQuery,
  OrderByClause,
  OrderDirection,
  QueryDescriptor,
  RawWhereClause,
  WhereClause,
} from "./types";
import {
  TableRef,
  assertKnownColumnList,
  assertKnownColumns,
  buildOrderByClause,
  buildReturningClause,
  buildWhereClause,
  buildTableRef,
  columnNameSet,
} from "./helpers";

export abstract class QueryBase<Cols extends string = string> {
  protected readonly _resolvedColumns: ColumnSchema[];
  protected readonly _knownCols: Set<string>;
  protected readonly _tableRef: TableRef;

  protected _whereClauses: WhereClause<Cols>[] = [];
  protected _rawWhereClauses: RawWhereClause[] = [];
  protected _orderByClauses: OrderByClause[] = [];
  protected _returningCols: string[] = [];

  constructor(model: ModelDefinition) {
    this._resolvedColumns = model.toTableSchema().columns;
    this._knownCols = columnNameSet(this._resolvedColumns);
    this._tableRef = {
      name: model._tableName,
      ...(model._schemaName !== undefined ? { schema: model._schemaName } : {}),
    };
  }

  where(clause: WhereClause<Cols>): this {
    this._whereClauses.push(clause);
    return this;
  }

  whereRaw(clause: RawWhereClause): this {
    this._rawWhereClauses.push(clause);
    return this;
  }

  orderBy(
    column: Cols,
    direction?: OrderDirection,
    nulls?: "NULLS FIRST" | "NULLS LAST",
  ): this {
    assertKnownColumnList([column], this._knownCols, "orderBy");
    const clause: OrderByClause = { column };
    if (direction !== undefined) clause.direction = direction;
    if (nulls !== undefined) clause.nulls = nulls;
    this._orderByClauses.push(clause);
    return this;
  }

  returning(cols: Cols[] = []): this {
    assertKnownColumnList(cols as string[], this._knownCols, "returning");
    this._returningCols = cols as string[];
    return this;
  }

  protected _buildWhere(params: unknown[]): string {
    return buildWhereClause(
      this._whereClauses as WhereClause[],
      this._rawWhereClauses,
      params,
      this._knownCols,
    );
  }

  protected _buildOrderBy(): string {
    return buildOrderByClause(this._orderByClauses);
  }

  protected _buildReturning(): string {
    return buildReturningClause(this._returningCols);
  }

  protected _table(): string {
    return buildTableRef(this._tableRef);
  }

  protected _assertCols(obj: Record<string, unknown>, ctx: string): void {
    assertKnownColumns(obj, this._knownCols, ctx);
  }

  protected _assertColList(names: string[], ctx: string): void {
    assertKnownColumnList(names, this._knownCols, ctx);
  }

  abstract generateSql(): BuiltQuery;
  abstract generateJson(): QueryDescriptor;
}
