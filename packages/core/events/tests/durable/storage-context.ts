import { Pool } from "@damatjs/deps/pg";
import {
  createDurabilityClient,
  durabilitySystemMigrations,
  setDurabilityClient,
} from "@damatjs/durability";
import { eventsSystemMigrations } from "../../src/durable/migrations/catalog";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

export const pool = new Pool({ connectionString: databaseUrl });
export const durability = createDurabilityClient({ pool });
setDurabilityClient(durability);
let ready: Promise<void> | undefined;

export function ensureEventStorage(): Promise<void> {
  ready ??= migrate();
  return ready;
}

async function migrate(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(724036)");
    const catalogs = [durabilitySystemMigrations, eventsSystemMigrations];
    for (const migration of catalogs.flatMap(({ migrations }) => migrations)) {
      const exists = await migrationApplied(client, migration.owner, migration.id);
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
    await client.query("SELECT pg_advisory_unlock(724036)");
    client.release();
  }
}

async function migrationApplied(
  client: { query(sql: string, values?: unknown[]): Promise<{ rowCount: number | null }> },
  owner: string,
  id: string,
) {
  const current = await client.query(
    `SELECT 1 FROM "_damat_migration_logs"
     WHERE "module"=$1 AND "name"=$2 AND "status"='applied'`, [owner, id]
  ).catch(() => ({ rowCount: 0 }));
  if (current.rowCount) return current;
  return client.query(
    `SELECT 1 FROM "_damat_system_migrations"
     WHERE "owner"=$1 AND "migration_id"=$2`, [owner, id]
  ).catch(() => ({ rowCount: 0 }));
}

async function ensureTracker(client: { query(sql: string): Promise<unknown> }) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_damat_system_migrations" (
      "owner" TEXT NOT NULL, "migration_id" TEXT NOT NULL,
      PRIMARY KEY ("owner", "migration_id")
    )
  `);
}

export function uniqueEvent(prefix: string): string {
  return `${prefix}.${crypto.randomUUID()}`;
}
