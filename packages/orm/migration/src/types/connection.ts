import type { Pool, PoolClient } from "@damatjs/deps/pg";

// =============================================================================
// CONNECTION
// =============================================================================

/**
 * Database connection instance wrapping a pg Pool.
 */
export interface DatabaseConnection {
  /** pg connection pool */
  pool: Pool;
  /** Execute a raw SQL query */
  query: Pool["query"];
  /** Acquire a client from the pool */
  connect: () => Promise<PoolClient>;
  /** End the pool (close all connections) */
  close: () => Promise<void>;
  /** Check if the pool can reach the database */
  isConnected: () => Promise<boolean>;
}
