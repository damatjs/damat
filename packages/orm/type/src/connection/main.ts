import type { Pool, PoolClient } from "@damatjs/deps/pg";
import { PoolStats } from "./config";

export interface DbConnection {
  pool: Pool;
  close: () => Promise<void>;
  isConnected: () => Promise<boolean>;
  getClient: () => Promise<PoolClient>;
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: unknown[]; rowCount: number }>;
  transaction: <R>(callback: (client: PoolClient) => Promise<R>) => Promise<R>;
  getStats: () => PoolStats;
}
