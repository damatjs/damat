import type { Pool, PoolClient } from "@damatjs/deps/pg";
import { getQueryLogger, type QueryLogger } from "../logger";

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
