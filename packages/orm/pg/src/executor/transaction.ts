import type { Pool, PoolClient } from "@damatjs/orm-type";
import { getQueryLogger, type QueryLogger } from "@damatjs/orm-core";

export async function pgTransaction<R>(
  pool: Pool,
  callback: (client: PoolClient) => Promise<R>,
  logger?: QueryLogger,
): Promise<R> {
  const loggerInstance = logger ?? getQueryLogger();
  const client = await pool.connect();
  try {
    loggerInstance.logTransaction("begin");
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    loggerInstance.logTransaction("commit");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    loggerInstance.logTransaction("rollback");
    throw err;
  } finally {
    client.release();
  }
}
