import type { DatabaseConnection } from "../types";
import { connectionInstance } from "./singleton";

/**
 * Check if a database connection is healthy.
 *
 * @param connection - Database connection to check (defaults to singleton)
 * @returns true if connected and responsive
 */
export async function isConnectionHealthy(
  connection?: DatabaseConnection,
): Promise<boolean> {
  const conn = connection ?? connectionInstance;
  if (!conn) return false;
  return conn.isConnected();
}
