import { Pool } from "@damatjs/deps/pg";
import { createDurabilityClient, durabilitySystemMigrations } from "../src";

export const databaseUrl = process.env.DATABASE_URL;

export async function createRepositoryContext() {
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const pool = new Pool({ connectionString: databaseUrl });
  await ensureMigrations(pool);
  return { pool, durability: createDurabilityClient({ pool }) };
}

export function testId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

async function ensureMigrations(pool: Pool): Promise<void> {
  const client = await pool.connect();
  const tableByMigration: Record<string, string> = {
    "001": "_damat_idempotency_keys",
    "002": "_damat_work_controls",
  };
  try {
    await client.query("SELECT pg_advisory_lock(724034)");
    for (const migration of durabilitySystemMigrations.migrations) {
      const table = tableByMigration[migration.id];
      const existing = await client.query("SELECT to_regclass($1) AS name", [
        table,
      ]);
      if (!existing.rows[0]?.name) await client.query(migration.sql);
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(724034)");
    client.release();
  }
}
