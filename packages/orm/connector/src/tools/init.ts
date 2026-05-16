import type { Pool, DbPoolConfig } from "@damatjs/orm-type";
import { getPool, setPool, hasPool } from "./store";
import { createPool } from "./pool";

export async function initPool(config: string | DbPoolConfig): Promise<Pool> {
  if (hasPool()) {
    return getPool()!;
  }
  const pool = createPool(config);
  setPool(pool);
  return pool;
}
