/**
 * Module Directory Discovery
 *
 * Scans `modulesDir` for subdirectories that contain at least one
 * `Migration*.sql` file under their `migrations/` folder.  Used as the
 * automatic fallback when no explicit module list is provided.
 */

import fs from "node:fs";
import path from "node:path";

/**
 * Discover all module names that have migrations by scanning the filesystem.
 *
 * Walks every immediate subdirectory of `modulesDir` and returns those whose
 * `migrations/` folder contains at least one `Migration*.sql` file.
 *
 * @param modulesDir - Root modules directory (e.g. `"src/modules"`)
 * @returns Sorted array of module names that have at least one migration file
 *
 * @example
 * ```typescript
 * discoverModulesFromDir('src/modules');
 * // → ['billing', 'user']  (auto-discovered, no explicit list needed)
 * ```
 */
export function discoverModulesFromDir(modulesDir: string): string[] {
  if (!fs.existsSync(modulesDir)) {
    return [];
  }

  return fs
    .readdirSync(modulesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((moduleName) => {
      const migrationsDir = path.join(modulesDir, moduleName, "migrations");
      return (
        fs.existsSync(migrationsDir) &&
        fs
          .readdirSync(migrationsDir)
          .some((f) => f.startsWith("Migration") && f.endsWith(".sql"))
      );
    })
    .sort();
}

/**
 * Resolve the active module list using the following rules:
 *
 * 1. `activeModules` not provided **or** empty → return all discovered modules
 * 2. `activeModules` has entries → return only those that were also discovered
 *
 * @param modulesDir    - Root modules directory (e.g. `"src/modules"`)
 * @param activeModules - Optional allowlist provided by the caller
 * @returns Resolved module names that exist on disk and have migrations
 *
 * @example
 * ```typescript
 * resolveModules('src/modules');
 * // → ['billing', 'user']  (all discovered)
 *
 * resolveModules('src/modules', []);
 * // → ['billing', 'user']  (empty = all discovered)
 *
 * resolveModules('src/modules', ['user', 'notifications']);
 * // → ['user']  (notifications not on disk / has no migrations)
 * ```
 */
export function resolveModules(
  modulesDir: string,
  activeModules?: string[],
): string[] {
  const discovered = discoverModulesFromDir(modulesDir);

  if (!activeModules || activeModules.length === 0) {
    return discovered;
  }

  const discoveredSet = new Set(discovered);
  return activeModules.filter((m) => discoveredSet.has(m));
}
