import type { Pool, PoolClient } from "@damatjs/orm-type";
import { acquireClient } from './query';
import { getLogger } from "@damatjs/logger"

export async function runTransaction<R>(
  pool: Pool,
  callback: (client: PoolClient) => Promise<R>
): Promise<R> {
  const client = await acquireClient(pool);
  const logger = getLogger();
  try {
    logger.info("Starting Database Transaction");
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    logger.info("Transaction committed successfully");
    return result;
  } catch (err) {
    logger.error("Transaction committed failed. Rolling back", { err });
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function runTransactionWithClient<R>(
  client: PoolClient,
  callback: (client: PoolClient) => Promise<R>
): Promise<R> {
  const logger = getLogger();
  try {
    logger.info("Starting Database Transaction");
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    logger.info("Transaction committed successfully");
    return result;
  } catch (err) {
    logger.error("Transaction committed failed. Rolling back", { err });
    await client.query("ROLLBACK");
    throw err;
  }
}
