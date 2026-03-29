/**
 * All-Modules Migration Discovery
 *
 * Aggregates `.sql` migration files across every active module and returns them
 * sorted by timestamp so the executor can apply them in the correct global order.
 */

import fs from "node:fs";
import type { MigrationInfo } from "../types";
import { discoverModuleMigrations } from "./moduleMigrations";
import { resolveModules } from "./discoverModulesFromDir";

/**
 * Discover all migrations across every active module, sorted by timestamp.
 *
 * Resolution rules (delegated to `resolveModules`):
 * - `activeModules` not provided or empty → all discovered modules
 * - `activeModules` has entries → intersection with discovered modules
 *
 * @param modulesDir    - Root modules directory (e.g. `"src/modules"`)
 * @param activeModules - Optional allowlist of module names
 * @returns All migration info objects sorted oldest-first
 *
 * @example
 * ```typescript
 * discoverAllMigrations('src/modules');
 * // all modules auto-discovered
 *
 * discoverAllMigrations('src/modules', ['user', 'billing']);
 * // only user + billing
 *
 * discoverAllMigrations('src/modules', []);
 * // empty = all discovered
 * ```
 */
export function discoverAllMigrations(
  modulesDir: string,
  activeModules?: string[],
): MigrationInfo[] {
  if (!fs.existsSync(modulesDir)) {
    return [];
  }

  const modules = resolveModules(modulesDir, activeModules);
  const migrations: MigrationInfo[] = [];

  for (const moduleName of modules) {
    migrations.push(...discoverModuleMigrations(modulesDir, moduleName));
  }

  return migrations.sort((a, b) => a.timestamp - b.timestamp);
}
