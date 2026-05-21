/**
 * Migration Status Operations
 *
 * Functions for checking migration status across modules using pg Pool.
 */

import type { Pool } from "@damatjs/deps/pg";
import type { MigrationStatus, ModuleMigrationStatus } from "../types";
import { discoverModuleMigrations } from "../discovery";
import { MigrationTracker } from "../tracker";

/**
 * Get migration status for all modules.
 */
export async function getMigrationStatus(
  pool: Pool,
  modulesResolvers: string[]
): Promise<MigrationStatus> {
  const tracker = new MigrationTracker(pool);
  await tracker.ensureTable();

  const result: ModuleMigrationStatus[] = [];

  for (const modulesResolver of modulesResolvers) {
    const migrations = discoverModuleMigrations(modulesResolver);
    const applied = await tracker.getApplied(modulesResolver);
    const appliedNames = new Set(applied.map((a) => a.name));

    for (const m of migrations) {
      m.applied = appliedNames.has(m.name);
    }

    result.push({
      name: modulesResolver,
      applied: migrations.filter((m) => m.applied).length,
      pending: migrations.filter((m) => !m.applied).length,
      migrations,
    });
  }

  return { modules: result };
}

/**
 * Get migration status for a single module.
 */
export async function getModuleMigrationStatus(
  pool: Pool,
  modulesResolver: string,
): Promise<{ module: ModuleMigrationStatus }> {
  const tracker = new MigrationTracker(pool);
  await tracker.ensureTable();

  const migrations = discoverModuleMigrations(modulesResolver);

  if (migrations.length === 0) {
    throw new Error(
      `Module '${modulesResolver}' not found or has no migrations`,
    );
  }

  const applied = await tracker.getApplied(modulesResolver);
  const appliedNames = new Set(applied.map((a) => a.name));

  for (const m of migrations) {
    m.applied = appliedNames.has(m.name);
  }

  return {
    module: {
      name: modulesResolver,
      applied: migrations.filter((m) => m.applied).length,
      pending: migrations.filter((m) => !m.applied).length,
      migrations,
    },
  };
}
