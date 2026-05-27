import { developmentPoolConfig, productionPoolConfig, testPoolConfig, ConnectionManager } from "@damatjs/orm-connector";
import { PoolManager } from "@damatjs/services";
import type { ConnectionStatus, DbPoolConfigWithExtras, Pool } from "@damatjs/orm-type";
import type { ILogger } from "@damatjs/logger";

let connectionManager: ConnectionManager | null = null;

export async function initDatabase(
  dbConfig: DbPoolConfigWithExtras,
  logger: ILogger,
  nodeEnv: "development" | "production" | "test" = "development"
): Promise<Pool> {
  if (!connectionManager) {
    const baseConfig = getPoolConfigByEnv(nodeEnv, dbConfig);
    connectionManager = new ConnectionManager(baseConfig, logger);
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

function getPoolConfigByEnv(
  nodeEnv: "development" | "production" | "test",
  config: DbPoolConfigWithExtras
): DbPoolConfigWithExtras {
  const hasAdvancedSettings =
    config.min !== undefined ||
    config.max !== undefined ||
    config.idleTimeoutMillis !== undefined ||
    config.connectionTimeoutMillis !== undefined;

  if (hasAdvancedSettings) {
    return config;
  }

  const baseConfig: DbPoolConfigWithExtras = { ...config };

  switch (nodeEnv) {
    case "production":
      return { ...productionPoolConfig(), ...baseConfig };
    case "test":
      return { ...testPoolConfig(), ...baseConfig };
    case "development":
    default:
      return { ...developmentPoolConfig(), ...baseConfig };
  }
}
