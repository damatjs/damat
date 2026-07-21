import type { Pool } from "@damatjs/deps/pg";
import type { SystemMigration } from "@damatjs/durability";
import type { ModuleMigrationResult } from "../types";
import type { MigrationTracker } from "../tracker";

export interface MigrationRunOptions {
  systemMigrations?: readonly SystemMigration[];
}

async function executeSystemMigration(
  pool: Pool,
  migration: SystemMigration,
  tracker: MigrationTracker,
): Promise<Error | undefined> {
  const started = Date.now();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(migration.sql);
    await tracker.recordApplied(
      migration.owner,
      migration.id,
      Date.now() - started,
      client,
    );
    await client.query("COMMIT");
  } catch (cause) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Releasing the client preserves the migration failure.
    }
    return cause instanceof Error ? cause : new Error(String(cause));
  } finally {
    client.release();
  }
  return undefined;
}

export async function runSystemMigrations(
  pool: Pool,
  migrations: readonly SystemMigration[],
  tracker: MigrationTracker,
): Promise<ModuleMigrationResult[]> {
  const ordered = [...migrations].sort((a, b) => a.order - b.order);
  const owners = [...new Set(ordered.map((item) => item.owner))];
  const results = new Map<string, ModuleMigrationResult>();
  const applied = new Map<string, Set<string>>();
  for (const owner of owners) {
    const names = new Set(
      (await tracker.getApplied(owner)).map((row) => row.name),
    );
    applied.set(owner, names);
    results.set(owner, {
      success: true,
      applied: [],
      pending: ordered
        .filter((item) => item.owner === owner && !names.has(item.id))
        .map((item) => item.id),
    });
  }
  for (const migration of ordered) {
    if (applied.get(migration.owner)?.has(migration.id)) continue;
    const error = await executeSystemMigration(pool, migration, tracker);
    const result = results.get(migration.owner)!;
    if (error) {
      result.success = false;
      result.error = error;
      break;
    }
    result.applied.push(migration.id);
  }
  return [...results.values()];
}
