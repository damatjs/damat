import { ConnectionManager } from "@damatjs/orm-connector";
import { PoolManager } from "@damatjs/services";
import type { DbPoolConfigWithExtras, Pool } from "@damatjs/orm-type";
import type { ILogger } from "@damatjs/logger";

let connectionManager: ConnectionManager | null = null;

export async function initDatabase(dbConfig: DbPoolConfigWithExtras, logger: ILogger): Promise<Pool> {
  if (!connectionManager) {
    connectionManager = new ConnectionManager(dbConfig, logger);
  }
  const pool = await connectionManager.connect();

  PoolManager.setup({
    pool,
    logger,
    connectionManager,
  });

  logger.info("Database connected");
  return pool;
}

export function getConnectionManager(): ConnectionManager | null {
  return connectionManager;
}

export async function closeDatabase(): Promise<void> {
  if (connectionManager) {
    await connectionManager.disconnect();
    connectionManager = null;
  }
  PoolManager.reset();
}
