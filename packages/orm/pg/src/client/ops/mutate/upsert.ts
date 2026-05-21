import { pgExecuteRaw } from "../../../executor";
import type { UpsertDescriptor } from "../../../query";
import type { PgInsertResult } from "../../../types";
import type { PgModelClientLike, UpsertOptions } from "../../types";
import type { QueryResultRow } from "@damatjs/deps/pg";

export async function executeUpsert<
  T extends QueryResultRow = Record<string, unknown>,
  Cols extends string = string,
>(
  client: PgModelClientLike<T, Cols>,
  options: UpsertOptions<Cols>,
): Promise<PgInsertResult<T>> {
  const { sql, json } = client.accessor.upsert(options);
  const { rows, rowCount } = await pgExecuteRaw<T>(client._conn, sql, client._logger);
  return { rows, rowCount, descriptor: json as UpsertDescriptor };
}
