import { SelectBuilder } from "../select";
import type { FindOptions, QueryResult } from "./type";
import type { SelectDescriptor } from "../types";

export function applyFindOptions<Cols extends string>(b: SelectBuilder<Cols>, options: FindOptions<Cols>): void {
  if (options.select) b.columns(options.select);
  if (options.where) b.where(options.where);
  if (options.whereRaw) {
    const raws = Array.isArray(options.whereRaw) ? options.whereRaw : [options.whereRaw];
    for (const r of raws) b.whereRaw(r);
  }
  if (options.orderBy) {
    for (const o of options.orderBy) b.orderBy(o.column, o.direction, o.nulls);
  }
  if (options.limit !== undefined) b.limit(options.limit);
  if (options.offset !== undefined) b.offset(options.offset);
  if (options.distinct) b.distinct();
  if (options.with) b.with(options.with);
}

export function executeFindMany(accessor: any, options: FindOptions<any> = {}): QueryResult<SelectDescriptor> {
  const b = new SelectBuilder<any>(accessor._model);
  applyFindOptions(b, options);
  return { sql: b.generateSql(), json: b.generateJson() };
}

export function executeFindOne(accessor: any, options: Omit<FindOptions<any>, "limit" | "offset"> = {}): QueryResult<SelectDescriptor> {
  const b = new SelectBuilder<any>(accessor._model);
  applyFindOptions(b, options);
  b.limit(1);
  return { sql: b.generateSql(), json: b.generateJson() };
}
