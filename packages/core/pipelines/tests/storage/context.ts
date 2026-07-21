import { Pool, type PoolClient } from "@damatjs/deps/pg";
import {
  createDurabilityClient,
  durabilitySystemMigrations,
  setDurabilityClient,
  type SystemMigrationCatalog,
} from "@damatjs/durability";
import { jobsSystemMigrations } from "@damatjs/jobs/migrations";
import { eventsSystemMigrations } from "@damatjs/events/migrations";
import { pipelinesSystemMigrations } from "../../src/migrations";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
export const pool = new Pool({ connectionString: databaseUrl });
export const durability = createDurabilityClient({ pool });
setDurabilityClient(durability);
let ready: Promise<void> | undefined;

export const ensureStorage = () => (ready ??= migrate());
export const uniqueName = (prefix: string) =>
  `${prefix}-${crypto.randomUUID()}`;

async function migrate(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(724038)");
    const catalogs: SystemMigrationCatalog[] = [
      durabilitySystemMigrations,
      jobsSystemMigrations,
      eventsSystemMigrations,
      pipelinesSystemMigrations,
    ];
    for (const migration of catalogs.flatMap((catalog) => catalog.migrations)) {
      if (await applied(client, migration.owner, migration.id)) continue;
      await client.query(migration.sql);
      await tracker(client);
      await client.query(
        `INSERT INTO "_damat_system_migrations" ("owner","migration_id")
         VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [migration.owner, migration.id],
      );
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(724038)");
    client.release();
  }
}

async function applied(
  client: PoolClient,
  owner: string,
  id: string,
): Promise<boolean> {
  const legacy = await client
    .query(
      `SELECT 1 FROM "_damat_migration_logs"
     WHERE "module"=$1 AND "name"=$2 AND "status"='applied'`,
      [owner, id],
    )
    .catch(() => ({ rowCount: 0 }));
  if (legacy.rowCount) return true;
  const current = await client
    .query(
      `SELECT 1 FROM "_damat_system_migrations"
     WHERE "owner"=$1 AND "migration_id"=$2`,
      [owner, id],
    )
    .catch(() => ({ rowCount: 0 }));
  return Boolean(current.rowCount);
}

function tracker(client: PoolClient) {
  return client.query(`CREATE TABLE IF NOT EXISTS "_damat_system_migrations" (
    "owner" TEXT NOT NULL,"migration_id" TEXT NOT NULL,
    PRIMARY KEY ("owner","migration_id"))`);
}
