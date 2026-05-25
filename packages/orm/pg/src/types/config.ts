import type { Pool, PoolClient, QueryResultRow } from "@damatjs/orm-type";
import type { ILogger } from "@damatjs/logger";

export type { Pool, PoolClient, QueryResultRow };
export type { ILogger };

export interface PgEntityManagerConfig {
  pool: Pool;
  logger?: ILogger;
}
