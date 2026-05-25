import { pgTransaction } from "../../executor";
import type { PgModelClientLike } from "../types";
import type { PoolClient, QueryResultRow } from "@damatjs/orm-type";

export async function executeTransaction<
  T extends QueryResultRow = Record<string, unknown>,
  Cols extends string = string,
  R = unknown,
>(
  client: PgModelClientLike<T, Cols>,
  callback: (tx: PgModelClientLike<T, Cols>) => Promise<R>,
): Promise<R> {
  return pgTransaction(client._pool, async (conn: PoolClient) => {
    const tx = client.withClient(conn);
    return callback(tx);
  }, client._logger);
}
