/**
 * Migration Status Operations
 *
 * Functions for checking migration status across modules.
 */

import type { MikroORM } from "@damatjs/deps/mikro-orm/core";
import type { MigrationInfo } from "../../types";
import {
  discoverModuleMigrations,
  listModulesWithMigrations,
} from "../discovery";
import { MigrationTracker } from "../tracker";

/**
 * Get migration status for all modules.
 *
 * @param orm - MikroORM instance
 * @param modulesDir - Path to the modules directory
 * @param activeModules - List of active module names
 * @returns Migration status for all modules
 *
 * @example
 * ```typescript
 * const status = await getMigrationStatus(orm, './src/modules', ['user', 'billing']);
 *
 * for (const mod of status.modules) {
 *   console.log(`${mod.name}: ${mod.applied} applied, ${mod.pending} pending`);
 * }
 * ```
 */
export async function getMigrationStatus(
  orm: MikroORM,
  modulesDir: string,
  activeModules: string[],
): Promise<{
  modules: Array<{
    name: string;
    applied: number;
    pending: number;
    migrations: MigrationInfo[];
  }>;
}> {
  const tracker = new MigrationTracker(orm);
  await tracker.ensureTable();

  const modules = listModulesWithMigrations(modulesDir, activeModules);
  const result: Array<{
    name: string;
    applied: number;
    pending: number;
    migrations: MigrationInfo[];
  }> = [];

  for (const moduleName of modules) {
    const migrations = discoverModuleMigrations(modulesDir, moduleName);
    const applied = await tracker.getApplied(moduleName);
    const appliedNames = new Set(applied.map((a) => a.name));

    // Update applied status
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
 * Get migration status for a module.
 *
 * @param orm - MikroORM instance
 * @param modulesDir - Path to the modules directory
 * @param moduleName - Name of the module
 * @returns Migration status for the module
 *
 * @example
 * ```typescript
 * const status = await getModuleMigrationStatus(orm, './src/modules', 'user');
 *
 * console.log(`${status.module.name}: ${status.module.applied} applied, ${status.module.pending} pending`);
 * ```
 */
export async function getModuleMigrationStatus(
  orm: MikroORM,
  modulesDir: string,
  moduleName: string,
): Promise<{
  module: {
    name: string;
    applied: number;
    pending: number;
    migrations: MigrationInfo[];
  };
}> {
  const tracker = new MigrationTracker(orm);
  await tracker.ensureTable();

  const modules = listModulesWithMigrations(modulesDir, [moduleName]);

  if (modules.length === 0) {
    throw new Error(`Module '${moduleName}' not found at ${modulesDir}`);
  }

  const module = modules[0]!
  const migrations = discoverModuleMigrations(modulesDir, module);
  const applied = await tracker.getApplied(moduleName);
  const appliedNames = new Set(applied.map((a) => a.name));

  // Update applied status
  for (const m of migrations) {
    m.applied = appliedNames.has(m.name);
  }

  return {
    module: {
      name: moduleName,
      applied: migrations.filter((m) => m.applied).length,
      pending: migrations.filter((m) => !m.applied).length,
      migrations,
    }
  };
}
