import { pgExecuteRaw } from "../../../executor";
import type { InsertDescriptor, QueryResultRow } from "@damatjs/orm-type";
import type { PgInsertResult } from "../../../types";
import type { PgModelClientLike, CreateOptions } from "../../types";

export async function executeCreate<
  T extends QueryResultRow = Record<string, unknown>,
  Cols extends string = string,
>(
  client: PgModelClientLike<T, Cols>,
  options: CreateOptions<Cols>,
): Promise<PgInsertResult<T>> {
  const { sql, json } = client.accessor.create(options);
  const { rows, rowCount } = await pgExecuteRaw<T>(
    client._conn,
    sql,
    client._logger,
  );
  return { rows, rowCount, descriptor: json as InsertDescriptor };
}
