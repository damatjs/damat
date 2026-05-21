import { pgExecuteRaw } from "../../../executor";
import type { UpdateDescriptor } from "../../../query";
import type { PgUpdateResult } from "../../../types";
import type { PgModelClientLike, UpdateOptions } from "../../types";
import type { QueryResultRow } from "@damatjs/deps/pg";

export async function executeUpdate<
  T extends QueryResultRow = Record<string, unknown>,
  Cols extends string = string,
>(
  client: PgModelClientLike<T, Cols>,
  options: UpdateOptions<Cols>,
): Promise<PgUpdateResult<T>> {
  const { sql, json } = client.accessor.update(options);
  const { rows, rowCount } = await pgExecuteRaw<T>(client._conn, sql, client._logger);
  return { rows, rowCount, descriptor: json as UpdateDescriptor };
}
