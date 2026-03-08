/**
 * Migration Discovery
 *
 * Functions for discovering migration files across modules.
 */

import fs from "node:fs";
import type { MigrationInfo } from "../../types";
import { discoverModuleMigrations } from './moduleMigrations';

/**
 * Discovers all migrations across all active modules.
 *
 * @param modulesDir - Path to the modules directory
 * @param activeModules - List of active module names
 * @returns Array of migration info objects sorted by timestamp
 *
 * @example
 * ```typescript
 * const migrations = discoverAllMigrations(
 *   './src/modules',
 *   ['user', 'billing', 'notifications'],
 * );
 * ```
 */
export function discoverAllMigrations(
  modulesDir: string,
  activeModules: string[],
): MigrationInfo[] {
  const migrations: MigrationInfo[] = [];

  if (!fs.existsSync(modulesDir)) {
    return migrations;
  }

  for (const moduleName of activeModules) {
    const moduleMigrations = discoverModuleMigrations(modulesDir, moduleName);
    migrations.push(...moduleMigrations);
  }

  // Sort by timestamp globally
  return migrations.sort((a, b) => a.timestamp - b.timestamp);
}
