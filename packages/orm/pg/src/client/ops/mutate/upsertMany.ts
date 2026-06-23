import { pgExecuteRaw } from "../../../executor";
import type { UpsertDescriptor, QueryResultRow } from "@damatjs/orm-type";
import type { PgInsertResult } from "../../../types";
import type { PgModelClientLike, UpsertManyOptions } from "../../types";

export async function executeUpsertMany<
  T extends QueryResultRow = Record<string, unknown>,
  Cols extends string = string,
>(
  client: PgModelClientLike<T, Cols>,
  options: UpsertManyOptions<Cols>,
): Promise<PgInsertResult<T>> {
  const { sql, json } = client.accessor.upsertMany(options);
  const { rows, rowCount } = await pgExecuteRaw<T>(client._conn, sql, client._logger);
  return { rows, rowCount, descriptor: json as UpsertDescriptor };
}
