/**
 * Migration Discovery
 *
 * Functions for discovering migration files across modules.
 */

import { MigrationInfo } from '../../types';
import fs from "node:fs";
import path from "node:path";

/**
 * Discovers migrations for a specific module.
 *
 * @param modulesDir - Path to the modules directory
 * @param moduleName - Name of the module
 * @returns Array of migration info objects
 *
 * @example
 * ```typescript
 * const migrations = discoverModuleMigrations('./src/modules', 'user');
 * // Returns migrations from ./src/modules/user/migrations/
 * ```
 */
export function discoverModuleMigrations(
  modulesDir: string,
  moduleName: string,
): MigrationInfo[] {
  const migrationsDir = path.join(modulesDir, moduleName, "migrations");

  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".ts") && f.startsWith("Migration"))
    .sort();

  return files.map((file) => {
    // Extract timestamp from filename like Migration20260211_Initial.ts
    const match = file.match(/Migration(\d+)/);
    const timestamp = match && match[1] ? parseInt(match[1], 10) : 0;

    return {
      name: file.replace(".ts", ""),
      module: moduleName,
      path: path.join(migrationsDir, file),
      timestamp,
      applied: false, // Will be updated when checking against DB
    };
  });
}
