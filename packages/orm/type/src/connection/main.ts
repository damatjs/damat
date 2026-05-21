import type { Pool } from "@damatjs/deps/pg";
import type { DbPoolStats } from "./config";
import type { DbPoolClient } from "./client";

export interface DbConnection {
  pool: Pool;
  close: () => Promise<void>;
  isConnected: () => Promise<boolean>;
  getClient: () => Promise<DbPoolClient>;
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number }>;
  transaction: <R>(callback: (client: DbPoolClient) => Promise<R>) => Promise<R>;
  getStats: () => DbPoolStats;
}
