import type { QueryResultRow } from "@damatjs/deps/pg";
import { pgExecuteRaw } from "../../../executor";
import type { SelectDescriptor } from "../../../query";
import type { PgSelectResult } from "../../../types";
import type { PgModelClientLike, FindOneOptions } from "../../types";

export async function executeFindOne<
  T extends QueryResultRow = Record<string, unknown>,
  Cols extends string = string,
>(
  client: PgModelClientLike<T, Cols>,
  options: FindOneOptions<Cols>,
): Promise<PgSelectResult<T>> {
  const { sql, json } = client.accessor.findOne(options);
  const { rows, rowCount } = await pgExecuteRaw<T>(client._conn, sql, client._logger);
  return { rows, rowCount, descriptor: json as SelectDescriptor };
}
