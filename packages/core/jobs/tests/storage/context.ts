import { Pool } from "@damatjs/deps/pg";
import {
  createDurabilityClient,
  durabilitySystemMigrations,
  setDurabilityClient,
} from "@damatjs/durability";
import { jobsSystemMigrations } from "../../src/migrations/catalog";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

export const pool = new Pool({ connectionString: databaseUrl });
export const durability = createDurabilityClient({ pool });
setDurabilityClient(durability);

let ready: Promise<void> | undefined;

export function ensureStorage(): Promise<void> {
  ready ??= migrate();
  return ready;
}

async function migrate(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(724035)");
    const catalogs = [durabilitySystemMigrations, jobsSystemMigrations];
    for (const migration of catalogs.flatMap(({ migrations }) => migrations)) {
      const exists = await client
        .query(
          `SELECT 1 FROM "_damat_system_migrations"
         WHERE "owner" = $1 AND "migration_id" = $2`,
          [migration.owner, migration.id],
        )
        .catch(() => ({ rowCount: 0 }));
      if (exists.rowCount) continue;
      await client.query(migration.sql);
      await ensureTracker(client);
      await client.query(
        `INSERT INTO "_damat_system_migrations" ("owner", "migration_id")
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [migration.owner, migration.id],
      );
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(724035)");
    client.release();
  }
}

async function ensureTracker(client: { query(sql: string): Promise<unknown> }) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_damat_system_migrations" (
      "owner" TEXT NOT NULL, "migration_id" TEXT NOT NULL,
      PRIMARY KEY ("owner", "migration_id")
    )
  `);
}

export function uniqueName(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
