import type {
  DurabilityClient,
  DurabilityExecutor,
  DurabilityPool,
} from "./types";

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
      try {
        await client.query("BEGIN");
        const result = await callback(client);
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
        client.release();
      }
    },
  };
}
