import type { QueryResultRow, SelectDescriptor } from "@damatjs/orm-type";
import { pgExecuteRaw } from "../../../executor";
import type { PgSelectResult } from "../../../types";
import type { PgModelClientLike, FindOptions } from "../../types";

export async function executeFindMany<
  T extends QueryResultRow = Record<string, unknown>,
  Cols extends string = string,
>(
  client: PgModelClientLike<T, Cols>,
  options: FindOptions<Cols> = {},
): Promise<PgSelectResult<T>> {
  const { sql, json } = client.accessor.findMany(options);
  const { rows, rowCount } = await pgExecuteRaw<T>(client._conn, sql, client._logger);
  return { rows, rowCount, descriptor: json as SelectDescriptor };
}
