import { pgExecuteRaw } from "../../../executor";
import type { InsertDescriptor } from "../../../query";
import type { PgInsertResult } from "../../../types";
import type { PgModelClientLike, CreateManyOptions } from "../../types";
import type { QueryResultRow } from "@damatjs/deps/pg";

export async function executeCreateMany<
  T extends QueryResultRow = Record<string, unknown>,
  Cols extends string = string,
>(
  client: PgModelClientLike<T, Cols>,
  options: CreateManyOptions<Cols>,
): Promise<PgInsertResult<T>> {
  const { sql, json } = client.accessor.createMany(options);
  const { rows, rowCount } = await pgExecuteRaw<T>(client._conn, sql, client._logger);
  return { rows, rowCount, descriptor: json as InsertDescriptor };
}
