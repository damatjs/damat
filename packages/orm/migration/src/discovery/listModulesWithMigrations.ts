/**
 * Module Filter — Migrations Present
 *
 * Filters a list of module names down to only those that actually have at
 * least one `Migration*.ts` file on disk.  Used by the executor and CLI to
 * avoid processing modules that have never had a migration generated.
 */

import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return the subset of `activeModules` that have at least one migration file.
 *
 * A module "has migrations" when its
 * `{modulesDir}/{module}/migrations/` directory exists and contains at least
 * one file matching `Migration*.ts`.
 *
 * @param modulesDir    - Root modules directory (e.g. `"src/modules"`)
 * @param activeModules - Candidate module names to check
 * @returns Module names (in original order) that have migrations
 *
 * @example
 * ```typescript
 * listModulesWithMigrations('src/modules', ['user', 'billing', 'notifications']);
 * // → ['user', 'billing']  (if notifications/ has no Migration files yet)
 * ```
 */
export function listModulesWithMigrations(
  modulesDir: string,
  modules?: string[],
): string[] {
  if (!fs.existsSync(modulesDir) || !modules) {
    return [];
  }

  return modules.filter((moduleName) => {
    const migrationsDir = path.join(modulesDir, moduleName, "migrations");
    return (
      fs.existsSync(migrationsDir) &&
      fs
        .readdirSync(migrationsDir)
        .some((f) => f.startsWith("Migration") && f.endsWith(".ts"))
    );
  });
}
