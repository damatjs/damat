import type { Pool, PoolClient } from "@damatjs/orm-type";
import type { ILogger } from "@damatjs/logger";
import type { ModelDefinition } from "@damatjs/orm-model";
import { PgRepository } from "./repository";

export function createRepository<T extends Record<string, any> = Record<string, any>>(
  model: ModelDefinition,
  connection: Pool | PoolClient | { getPool: () => Pool },
  logger: ILogger,
  isInTransaction = false
): PgRepository<T> {
  let conn: Pool | PoolClient;
  
  if (typeof connection === "object" && connection !== null && "getPool" in connection) {
    conn = (connection as { getPool: () => Pool }).getPool();
    isInTransaction = false;
  } else {
    conn = connection as Pool | PoolClient;
  }
  
  return new PgRepository<T>({
    model,
    connection: conn,
    logger,
    isInTransaction,
  });
}
