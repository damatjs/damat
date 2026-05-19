import { pgInsert, pgUpdate, pgDelete } from "../../executor";
import type { InsertDescriptor, UpdateDescriptor, DeleteDescriptor, UpsertDescriptor } from "../../query";
import type { PgInsertResult, PgUpdateResult, PgDeleteResult } from "../../types";

export async function executeCreate(client: any, options: any): Promise<PgInsertResult<any>> {
  const { sql, json } = client.accessor.create(options);
  return pgInsert(client._conn, sql, json as InsertDescriptor, client._logger);
}

export async function executeCreateMany(client: any, options: any): Promise<PgInsertResult<any>> {
  const { sql, json } = client.accessor.createMany(options);
  return pgInsert(client._conn, sql, json as InsertDescriptor, client._logger);
}

export async function executeUpdate(client: any, options: any): Promise<PgUpdateResult<any>> {
  const { sql, json } = client.accessor.update(options);
  return pgUpdate(client._conn, sql, json as UpdateDescriptor, client._logger);
}

export async function executeDelete(client: any, options: any): Promise<PgDeleteResult<any>> {
  const { sql, json } = client.accessor.delete(options);
  return pgDelete(client._conn, sql, json as DeleteDescriptor, client._logger);
}

export async function executeUpsert(client: any, options: any): Promise<PgInsertResult<any>> {
  const { sql, json } = client.accessor.upsert(options);
  return pgInsert(client._conn, sql, json as UpsertDescriptor, client._logger);
}
