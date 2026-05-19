import { InsertBuilder } from "../insert";
import { UpdateBuilder } from "../update";
import { DeleteBuilder } from "../delete";
import { UpsertBuilder } from "../upsert";
import type { QueryResult, CreateOptions, CreateManyOptions, UpdateOptions, DeleteOptions, UpsertOptions, UpsertManyOptions } from "./type";
import type { InsertDescriptor, UpdateDescriptor, DeleteDescriptor, UpsertDescriptor } from "../types";

export function executeCreate(accessor: any, options: CreateOptions<any>): QueryResult<InsertDescriptor> {
  const b = new InsertBuilder<any>(accessor._model);
  b.values(options.data);
  if (options.returning) b.returning(options.returning);
  if (options.onConflict) b.onConflict(options.onConflict);
  return { sql: b.generateSql(), json: b.generateJson() };
}

export function executeCreateMany(accessor: any, options: CreateManyOptions<any>): QueryResult<InsertDescriptor> {
  const b = new InsertBuilder<any>(accessor._model);
  b.values(options.data);
  if (options.returning) b.returning(options.returning);
  if (options.onConflict) b.onConflict(options.onConflict);
  return { sql: b.generateSql(), json: b.generateJson() };
}

export function executeUpdate(accessor: any, options: UpdateOptions<any>): QueryResult<UpdateDescriptor> {
  const b = new UpdateBuilder<any>(accessor._model);
  b.set(options.set);
  if (options.where) b.where(options.where);
  if (options.whereRaw) {
    const raws = Array.isArray(options.whereRaw) ? options.whereRaw : [options.whereRaw];
    for (const r of raws) b.whereRaw(r);
  }
  if (options.returning) b.returning(options.returning);
  if (options.allowFullTable) b.allowFullTable();
  return { sql: b.generateSql(), json: b.generateJson() };
}

export function executeDelete(accessor: any, options: DeleteOptions<any>): QueryResult<DeleteDescriptor> {
  const b = new DeleteBuilder<any>(accessor._model);
  if (options.where) b.where(options.where);
  if (options.whereRaw) {
    const raws = Array.isArray(options.whereRaw) ? options.whereRaw : [options.whereRaw];
    for (const r of raws) b.whereRaw(r);
  }
  if (options.returning) b.returning(options.returning);
  if (options.allowFullTable) b.allowFullTable();
  return { sql: b.generateSql(), json: b.generateJson() };
}

export function executeUpsert(accessor: any, options: UpsertOptions<any>): QueryResult<UpsertDescriptor> {
  const b = new UpsertBuilder<any>(accessor._model);
  b.values(options.data);
  b.onConflict(options.onConflict);
  if (options.updateColumns) b.updateColumns(options.updateColumns);
  if (options.set) b.set(options.set);
  if (options.returning) b.returning(options.returning);
  return { sql: b.generateSql(), json: b.generateJson() };
}

export function executeUpsertMany(accessor: any, options: UpsertManyOptions<any>): QueryResult<UpsertDescriptor> {
  const b = new UpsertBuilder<any>(accessor._model);
  b.values(options.data);
  b.onConflict(options.onConflict);
  if (options.updateColumns) b.updateColumns(options.updateColumns);
  if (options.set) b.set(options.set);
  if (options.returning) b.returning(options.returning);
  return { sql: b.generateSql(), json: b.generateJson() };
}
