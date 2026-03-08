/**
 * Migration Discovery
 *
 * Functions for discovering migration files across modules.
 */

import fs from "node:fs";
import path from "node:path";

/**
 * Lists all modules that have migrations.
 *
 * @param modulesDir - Path to the modules directory
 * @param activeModules - List of active module names
 * @returns Array of module names that have migrations
 *
 * @example
 * ```typescript
 * const modules = listModulesWithMigrations(
 *   './src/modules',
 *   ['user', 'billing', 'notifications'],
 * );
 * // Returns: ['user', 'billing'] (if notifications has no migrations)
 * ```
 */
export function listModulesWithMigrations(
  modulesDir: string,
  activeModules: string[],
): string[] {
  if (!fs.existsSync(modulesDir)) {
    return [];
  }

  return activeModules.filter((d) => {
    const migrationsDir = path.join(modulesDir, d, "migrations");
    if (!fs.existsSync(migrationsDir)) return false;
    return fs
      .readdirSync(migrationsDir)
      .some((f) => f.startsWith("Migration") && f.endsWith(".ts"));
  });
}
