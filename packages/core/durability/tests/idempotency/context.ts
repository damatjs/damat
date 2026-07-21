import { Pool } from "@damatjs/deps/pg";
import {
  createDurabilityClient,
  durabilitySystemMigrations,
  type DurabilityClient,
} from "../../src";

export const databaseUrl = process.env.DATABASE_URL;

export interface IdempotencyTestContext {
  pool: Pool;
  durability: DurabilityClient;
}

export async function createTestContext(): Promise<IdempotencyTestContext> {
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const pool = new Pool({ connectionString: databaseUrl });
  await ensureTables(pool);
  return { pool, durability: createDurabilityClient({ pool }) };
}

async function ensureTables(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(724031)");
    const existing = await client.query(
      "SELECT to_regclass('_damat_idempotency_keys') AS name",
    );
    if (!existing.rows[0]?.name) {
      const migration = durabilitySystemMigrations.migrations.find(
        ({ id }) => id === "001",
      );
      if (!migration) throw new Error("Missing durability migration 001");
      await client.query(migration.sql);
    }
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_damat_idempotency_test_effects" (
        "scope" TEXT PRIMARY KEY,
        "count" INTEGER NOT NULL DEFAULT 0
      )
    `);
  } finally {
    await client.query("SELECT pg_advisory_unlock(724031)");
    client.release();
  }
}

export function uniqueScope(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

export async function cleanup(
  context: IdempotencyTestContext,
  scope: string,
): Promise<void> {
  await context.pool.query(
    `DELETE FROM "_damat_idempotency_test_effects" WHERE "scope" = $1`,
    [scope],
  );
  await context.pool.query(
    `DELETE FROM "_damat_idempotency_keys" WHERE "scope" = $1`,
    [scope],
  );
}
