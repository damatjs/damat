import type { Pool, PoolClient, QueryResultRow } from "@damatjs/deps/pg";
import type { BuiltQuery } from "../query";
import { getQueryLogger, type QueryLogger } from "../logger";

export async function pgExecuteRaw<
  T extends QueryResultRow = Record<string, unknown>,
>(
  conn: Pool | PoolClient,
  query: BuiltQuery,
  logger?: QueryLogger,
): Promise<{ rows: T[]; rowCount: number }> {
  const loggerInstance = logger ?? getQueryLogger();
  const startTime = Date.now();

  try {
    loggerInstance.logQuery(query.sql, query.params);
    const result = await conn.query<T>(query.sql, query.params as unknown[]);
    const duration = Date.now() - startTime;
    loggerInstance.logSlowQuery(query.sql, duration, query.params);
    return {
      rows: result.rows,
      rowCount: result.rowCount ?? result.rows.length,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    loggerInstance.logQueryError(err, query.sql, query.params);
    throw error;
  }
}

export async function pgTransaction<R>(
  pool: Pool,
  callback: (client: PoolClient) => Promise<R>,
  logger?: QueryLogger,
): Promise<R> {
  const loggerInstance = logger ?? getQueryLogger();
  const client = await pool.connect();
  try {
    loggerInstance.logTransaction("begin");
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    loggerInstance.logTransaction("commit");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    loggerInstance.logTransaction("rollback");
    throw err;
  } finally {
    client.release();
  }
}
