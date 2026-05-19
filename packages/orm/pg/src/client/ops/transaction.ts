import { pgTransaction } from "../../executor";

export async function executeTransaction<R>(client: any, callback: (tx: any) => Promise<R>): Promise<R> {
  return pgTransaction(client._pool, async (conn) => {
    const tx = client.withClient(conn);
    return callback(tx);
  }, client._logger);
}
