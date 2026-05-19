import { initPool, getPool, closePool } from "@damatjs/orm-connector";
import type { Pool, DbPoolConfig } from "@damatjs/orm-type";

export async function initDatabase<TModules extends readonly any[]>(
  { databaseUrl, modules }: {
    databaseUrl: string | DbPoolConfig,
    modules: TModules
  }
): Promise<Pool> {

  const pool = await initPool(databaseUrl);

  for (const mod of modules) {
    mod.init(() => getPool());
  }

  return pool;
}

export { getPool, closePool };
