import { pgExecuteRaw } from "../../../executor";
import type { DeleteDescriptor, QueryResultRow } from "@damatjs/orm-type";
import type { PgDeleteResult } from "../../../types";
import type { PgModelClientLike, DeleteOptions } from "../../types";

export async function executeDelete<
  T extends QueryResultRow = Record<string, unknown>,
  Cols extends string = string,
>(
  client: PgModelClientLike<T, Cols>,
  options: DeleteOptions<Cols>,
): Promise<PgDeleteResult<T>> {
  const { sql, json } = client.accessor.delete(options);
  const { rows, rowCount } = await pgExecuteRaw<T>(
    client._conn,
    sql,
    client._logger,
  );
  return { rows, rowCount, descriptor: json as DeleteDescriptor };
}
