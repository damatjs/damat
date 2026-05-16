import type { Pool, PoolClient, QueryResultRow } from "@damatjs/orm-type";
import { getLogger } from "@damatjs/logger"

export async function executeQuery<T extends QueryResultRow = Record<string, unknown>>(
  pool: Pool,
  sql: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number, duration: number }> {
  const start = performance.now();
  try {
    const result = await pool.query<T>(sql, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount ?? result.rows.length,
      duration: performance.now() - start,
    };
  } catch (err) {
    const logger = getLogger();
    logger.error("Execute Query Error", err, { sql, params });
    throw err;
  }
}

export async function acquireClient(pool: Pool): Promise<PoolClient> {
  return pool.connect();
}

export function releaseClient(client: PoolClient): void {
  client.release();
}
