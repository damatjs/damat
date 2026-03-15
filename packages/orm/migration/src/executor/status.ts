/**
 * Migration Status Operations
 *
 * Functions for checking migration status across modules using pg Pool.
 */

import type { Pool } from "@damatjs/deps/pg";
import type { MigrationStatus, ModuleMigrationStatus } from "../types";
import {
  discoverModuleMigrations,
  listModulesWithMigrations,
} from "../discovery";
import { MigrationTracker } from "../tracker";

/**
 * Get migration status for all modules.
 */
export async function getMigrationStatus(
  pool: Pool,
  modulesDir: string,
  activeModules: string[],
): Promise<MigrationStatus> {
  const tracker = new MigrationTracker(pool);
  await tracker.ensureTable();

  const modules = listModulesWithMigrations(modulesDir, activeModules);
  const result: ModuleMigrationStatus[] = [];

  for (const moduleName of modules) {
    const migrations = discoverModuleMigrations(modulesDir, moduleName);
    const applied = await tracker.getApplied(moduleName);
    const appliedNames = new Set(applied.map((a) => a.name));

    for (const m of migrations) {
      m.applied = appliedNames.has(m.name);
    }

    result.push({
      name: moduleName,
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
  modulesDir: string,
  moduleName: string,
): Promise<{ module: ModuleMigrationStatus }> {
  const tracker = new MigrationTracker(pool);
  await tracker.ensureTable();

  const modules = listModulesWithMigrations(modulesDir, [moduleName]);

  if (modules.length === 0) {
    throw new Error(`Module '${moduleName}' not found at ${modulesDir}`);
  }

  const mod = modules[0]!;
  const migrations = discoverModuleMigrations(modulesDir, mod);
  const applied = await tracker.getApplied(moduleName);
  const appliedNames = new Set(applied.map((a) => a.name));

  for (const m of migrations) {
    m.applied = appliedNames.has(m.name);
  }

  return {
    module: {
      name: moduleName,
      applied: migrations.filter((m) => m.applied).length,
      pending: migrations.filter((m) => !m.applied).length,
      migrations,
    },
  };
}
