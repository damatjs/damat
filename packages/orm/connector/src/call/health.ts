import { getPool } from "../tools/store";
import { isPoolConnected } from "../tools/pool";

export async function isConnectionHealthy(): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;
  return isPoolConnected(pool);
}
