import { getPool, clearPool } from "./store";
import { closePool } from "./pool";
import { getLogger } from "@damatjs/logger"


export async function closePoolConnection(): Promise<void> {

  const pool = getPool();

  if (pool) {
    const logger = getLogger();
    logger.info("Closing Database Connection........");
    await closePool(pool);
    clearPool();
    logger.info("Database Connection closed");
  }
}
