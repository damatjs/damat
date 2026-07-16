/**
 * Migration Status Operations
 *
 * Functions for checking migration status across modules using pg Pool.
 */

import type { Pool } from "@damatjs/deps/pg";
import type { MigrationStatus, ModuleMigrationStatus } from "../types";
import { discoverModuleMigrations } from "../discovery";
import { MigrationTracker } from "../tracker";
import { OrmModuleContainer, OrmModule } from "@damatjs/orm-type";

/**
 * Get migration status for all modules.
 */
export async function getMigrationStatus(
  pool: Pool,
  moduleResolvers: OrmModuleContainer,
): Promise<MigrationStatus> {
  const tracker = new MigrationTracker(pool);
  await tracker.ensureTable();

  const result: ModuleMigrationStatus[] = [];

  for (const moduleResolver of Object.values(moduleResolvers)) {
    result.push(await moduleStatus(tracker, moduleResolver));
  }

  return { modules: result };
}

/**
 * Get migration status for a single module.
 */
export async function getModuleMigrationStatus(
  pool: Pool,
  moduleResolver: OrmModule,
): Promise<{ module: ModuleMigrationStatus }> {
  const tracker = new MigrationTracker(pool);
  await tracker.ensureTable();

  const migrations = discoverModuleMigrations(moduleResolver);

  if (migrations.length === 0) {
    throw new Error(
      `Module '${moduleResolver.name}' not found or has no migrations`,
    );
  }

  return { module: await moduleStatus(tracker, moduleResolver) };
}

/**
 * Cross-reference a module's discovered migrations with the tracker.
 * Tracker rows are keyed by module NAME (see executor/run.ts), so the filter
 * must use the same key — never the resolve path.
 */
async function moduleStatus(
  tracker: MigrationTracker,
  moduleResolver: OrmModule,
): Promise<ModuleMigrationStatus> {
  const migrations = discoverModuleMigrations(moduleResolver);
  const applied = await tracker.getApplied(moduleResolver.name);
  const appliedNames = new Set(applied.map((a) => a.name));

  for (const m of migrations) {
    m.applied = appliedNames.has(m.name);
  }

  return {
    name: moduleResolver.name,
    applied: migrations.filter((m) => m.applied).length,
    pending: migrations.filter((m) => !m.applied).length,
    migrations,
  };
}
