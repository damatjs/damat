import { existsSync } from "node:fs";
import { join, basename } from "node:path";
import { collectSystemMigrations } from "@damatjs/durability";
import { runMigrations } from "@damatjs/orm-migration";
import type { Pool } from "@damatjs/orm-type";
import type { ILogger } from "@damatjs/logger";
import { DEFAULT_MODULE_PATHS, type ModuleManifest } from "../manifest/types";
import { detectModuleCapabilities } from "../runtime/capabilities";
import { capabilityMigrationCatalogs } from "../runtime/migrations";

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
  if (force === false) return;
  const migrationsPath = join(
    moduleDir,
    manifest.paths?.migrations ?? DEFAULT_MODULE_PATHS.migrations,
  );
  const shouldMigrate = force === true || existsSync(migrationsPath);
  const systemMigrations = collectSystemMigrations(
    capabilityMigrationCatalogs(detectModuleCapabilities(moduleDir, manifest)),
  );
  if (!shouldMigrate && !systemMigrations.length) return;

  const name = manifest.name ?? basename(moduleDir);
  const modules = shouldMigrate
    ? {
        [name]: {
          id: name,
          name,
          path: moduleDir,
          resolve: moduleDir,
          migrations: migrationsPath,
        },
      }
    : {};
  const results = await runMigrations(pool, modules, { systemMigrations });
  const failure = results.find((result) => !result.success);
  if (failure) throw failure.error ?? new Error("Module migration failed");
  logger.info(`Migrations applied for module "${name}"`);
}
