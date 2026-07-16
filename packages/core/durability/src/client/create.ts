import type {
  DurabilityClient,
  DurabilityExecutor,
  DurabilityPool,
} from "./types";
import {
  createTransactionalExecutor,
  invalidateTransactionalExecutor,
} from "./transactional";

export function createDurabilityClient(options: {
  pool: DurabilityPool;
}): DurabilityClient {
  const { pool } = options;
  return {
    pool,
    query: (sql, params) => pool.query(sql, params),
    transaction: async <T>(
      callback: (executor: DurabilityExecutor) => Promise<T>,
    ) => {
      const client = await pool.connect();
      let executor: DurabilityExecutor | undefined;
      try {
        await client.query("BEGIN");
        executor = createTransactionalExecutor(client);
        const result = await callback(executor);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // Releasing an aborted client preserves the original error.
        }
        throw error;
      } finally {
        if (executor) invalidateTransactionalExecutor(executor);
        client.release();
      }
    },
  };
}
