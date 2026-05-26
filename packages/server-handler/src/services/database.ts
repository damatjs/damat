import { ConnectionManager } from "@damatjs/orm-connector";
import { PoolManager } from "@damatjs/services";
import type { Pool } from "@damatjs/orm-type";
import type { ILogger } from "@damatjs/logger";

let connectionManager: ConnectionManager | null = null;

export async function initDatabase(dbUrl: string, logger: ILogger): Promise<Pool> {
  connectionManager = new ConnectionManager({ connectionString: dbUrl });
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
