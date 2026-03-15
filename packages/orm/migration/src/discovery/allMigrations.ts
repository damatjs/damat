/**
 * All-Modules Migration Discovery
 *
 * Aggregates migration files across every active module and returns them
 * sorted by timestamp so the executor can apply them in the correct global order.
 */

import fs from "node:fs";
import type { MigrationInfo } from "../types";
import { discoverModuleMigrations } from "./moduleMigrations";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Discover all migrations across every active module, sorted by timestamp.
 *
 * Modules that have no `migrations/` directory are silently skipped.
 *
 * @param modulesDir    - Root modules directory (e.g. `"src/modules"`)
 * @param activeModules - Names of modules to include
 * @returns All migration info objects sorted oldest-first
 *
 * @example
 * ```typescript
 * const migrations = discoverAllMigrations('src/modules', ['user', 'billing']);
 * ```
 */
export function discoverAllMigrations(
  modulesDir: string,
  activeModules: string[],
): MigrationInfo[] {
  if (!fs.existsSync(modulesDir)) {
    return [];
  }

  const migrations: MigrationInfo[] = [];

  for (const moduleName of activeModules) {
    migrations.push(...discoverModuleMigrations(modulesDir, moduleName));
  }

  return migrations.sort((a, b) => a.timestamp - b.timestamp);
}
