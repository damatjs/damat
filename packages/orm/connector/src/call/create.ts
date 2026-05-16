import type { PoolClient, QueryResultRow, DbConnection, DbPoolConfig } from "@damatjs/orm-type";
import { createPool, closePool, isPoolConnected, getPoolStats } from "../tools/pool";
import { executeQuery, acquireClient } from "../util/query";
import { runTransaction } from "../util/transaction";
import { getLogger } from "@damatjs/logger"


export async function createConnection(config: string | DbPoolConfig): Promise<DbConnection> {
  const pool = createPool(config);

  const logger = getLogger();
  logger.info("Create Database Connection", {
    config
  });

  return {
    pool,
    close: async () => closePool(pool),
    isConnected: async () => isPoolConnected(pool),
    getClient: async () => acquireClient(pool),
    query: async <T extends QueryResultRow = Record<string, unknown>>(sql: string, params?: unknown[]) => {
      return executeQuery<T>(pool, sql, params);
    },
    transaction: async <R>(callback: (client: PoolClient) => Promise<R>) => {
      return runTransaction(pool, callback);
    },
    getStats: () => getPoolStats(pool),
  };
}
