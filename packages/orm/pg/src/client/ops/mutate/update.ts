import { pgExecuteRaw } from "../../../executor";
import type { UpdateDescriptor, QueryResultRow } from "@damatjs/orm-type";
import type { PgUpdateResult } from "../../../types";
import type { PgModelClientLike, UpdateOptions } from "../../types";

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
