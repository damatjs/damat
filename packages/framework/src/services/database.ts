import { ConnectionManager } from "@damatjs/orm-connector";
import { PoolManager } from "@damatjs/services";
import type { ConnectionStatus, DbPoolConfigWithExtras, Pool } from "@damatjs/orm-type";
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


export async function checkHealth(): Promise<ConnectionStatus | null> {
  if (connectionManager)
    return await connectionManager.healthCheck();
  return null
}

export async function closeDatabase(): Promise<void> {
  if (connectionManager) {
    await connectionManager.disconnect();
    connectionManager = null;
  }
  PoolManager.reset();
}
