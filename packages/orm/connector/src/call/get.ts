import { getPool } from "../tools/store";
import type { Pool } from "@damatjs/orm-type";
import { getLogger } from "@damatjs/logger"


export function getConnection(): Pool {
  const pool = getPool();

  if (!pool) {
    const logger = getLogger();
    logger.error("Database connection not initialized. Call initConnection() first.");
    throw new Error("Database connection not initialized. Call initConnection() first.");
  }
  return pool;
}
