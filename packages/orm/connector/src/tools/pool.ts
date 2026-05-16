import { Pool } from "@damatjs/deps/pg";
import type { Pool as PoolType, DbPoolConfig, DbPoolStats } from "@damatjs/orm-type";
import { getLogger } from "@damatjs/logger"

export function createPool(config: string | DbPoolConfig): PoolType {
  const poolConfig = typeof config === "string" ? { connectionString: config } : config;
  return new Pool(poolConfig);
}

export async function closePool(pool: PoolType): Promise<void> {
  await pool.end();
}

export async function isPoolConnected(pool: PoolType): Promise<boolean> {

  const logger = getLogger();
  try {
    const client = await pool.connect();
    logger.info("Database connection is healthy");
    client.release();
    return true;
  } catch (err) {
    logger.error("Database connection is not healthy", { err });
    return false;
  }
}

export function getPoolStats(pool: PoolType): DbPoolStats {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}
