import { existsSync } from "node:fs";
import { join, basename } from "node:path";
import { runMigrations } from "@damatjs/orm-migration";
import type { Pool } from "@damatjs/orm-type";
import type { ILogger } from "@damatjs/logger";
import { DEFAULT_MODULE_PATHS, type ModuleManifest } from "../manifest/types";

/**
 * Apply a module's own migrations to the given pool.
 * No-op when the module has no migrations directory (unless forced).
 */
export async function applyModuleMigrations(
  pool: Pool,
  moduleDir: string,
  manifest: ModuleManifest,
  logger: ILogger,
  force?: boolean,
): Promise<void> {
  const migrationsPath = join(
    moduleDir,
    manifest.paths?.migrations ?? DEFAULT_MODULE_PATHS.migrations,
  );
  const shouldMigrate = force ?? existsSync(migrationsPath);
  if (!shouldMigrate) return;

  const name = manifest.name ?? basename(moduleDir);
  await runMigrations(pool, {
    [name]: {
      id: name,
      name,
      path: moduleDir,
      resolve: moduleDir,
    },
  });
  logger.info(`Migrations applied for module "${name}"`);
}
