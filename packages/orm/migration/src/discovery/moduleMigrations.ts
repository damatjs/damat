/**
 * Module Migration Discovery
 *
 * Scans `{modulesDir}/{moduleName}/migrations/` for timestamped migration
 * files and returns them as structured `MigrationInfo` objects.
 *
 * Migration filename convention: `Migration{YYYYMMDDHHMMSS}_{Label}.sql`
 * e.g. `Migration20260316103000_Initial.sql`
 */

import fs from "node:fs";
import path from "node:path";
import type { MigrationInfo } from "../types";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Discover all migration files for a single module, sorted by timestamp.
 *
 * @param modulesDir - Root modules directory (e.g. `"src/modules"`)
 * @param moduleName - Name of the module   (e.g. `"user"`)
 * @returns Sorted array of migration info objects (oldest first)
 *
 * @example
 * ```typescript
 * const migrations = discoverModuleMigrations('src/modules', 'user');
 * // Scans src/modules/user/migrations/ for Migration*.sql files
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

  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.startsWith("Migration") && f.endsWith(".sql"))
    .sort()
    .map((file) => {
      // Extract the numeric timestamp from e.g. "Migration20260316103000_Initial.sql"
      const match = file.match(/Migration(\d+)/);
      const timestamp = match?.[1] ? parseInt(match[1], 10) : 0;

      return {
        name: file.replace(".sql", ""),
        module: moduleName,
        path: path.resolve(migrationsDir, file),
        timestamp,
        applied: false, // updated when cross-referenced with the DB tracker
      };
    });
}
