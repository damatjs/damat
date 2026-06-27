import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  createDiffMigration,
  runMigrations,
  MigrationTracker,
  discoverModuleMigrations,
} from "@damatjs/orm-migration";
import { ConnectionManager } from "@damatjs/orm-connector";
import { Logger } from "@damatjs/logger";
import { readModuleManifest } from "../manifest/read";
import { locateModuleDir } from "../runtime/locate";
import { resolveDatabaseConfig } from "../harness/database";
import { DEFAULT_MODULE_PATHS } from "../manifest/types";

export interface ModuleMigrationResult {
  hasChanges: boolean;
  filePath?: string;
}

/**
 * Create a migration for a standalone module package by diffing its models
 * against the last schema snapshot — no damat.config.ts required.
 */
export async function createModuleMigration(
  packageDir: string,
): Promise<ModuleMigrationResult> {
  const moduleDir = locateModuleDir(packageDir);
  const manifest = readModuleManifest(moduleDir);

  const result = await createDiffMigration(manifest.name, moduleDir);
  return {
    hasChanges: result.hasChanges ?? Boolean(result.filePath),
    ...(result.filePath ? { filePath: result.filePath } : {}),
  };
}

export interface RunModuleMigrationResult {
  /** The module whose migrations were applied. */
  moduleName: string;
  /** Migration names applied in this run. */
  applied: string[];
  /** Migration names that were pending before the run. */
  pending: string[];
  /** Whether every migration succeeded. */
  success: boolean;
  /** Error if a migration failed. */
  error?: Error;
  /** False when the module has no migrations directory yet. */
  hadMigrations: boolean;
}

/**
 * Apply a standalone module's own migration files to its DATABASE_URL — no
 * damat.config.ts required. Scoped to this module only: migrations are
 * discovered from the module's migrations directory and tracked under its
 * name, so nothing outside the module is touched. Run `createModuleMigration`
 * first to generate the SQL; this only applies what's already on disk.
 */
export async function runModuleMigration(
  packageDir: string,
): Promise<RunModuleMigrationResult> {
  const moduleDir = locateModuleDir(packageDir);
  const manifest = readModuleManifest(moduleDir);

  const migrationsPath = join(
    moduleDir,
    manifest.paths?.migrations ?? DEFAULT_MODULE_PATHS.migrations,
  );
  if (!existsSync(migrationsPath)) {
    return {
      moduleName: manifest.name,
      applied: [],
      pending: [],
      success: true,
      hadMigrations: false,
    };
  }

  const dbConfig = resolveDatabaseConfig({});
  const logger = new Logger({ prefix: manifest.name, timestamp: false });
  const connection = new ConnectionManager(dbConfig, logger);
  const pool = await connection.connect();

  try {
    const results = await runMigrations(pool, {
      [manifest.name]: {
        id: manifest.name,
        name: manifest.name,
        path: moduleDir,
        resolve: moduleDir,
      },
    });
    const result = results[0] ?? { success: true, applied: [], pending: [] };
    return {
      moduleName: manifest.name,
      applied: result.applied,
      pending: result.pending,
      success: result.success,
      ...(result.error ? { error: result.error } : {}),
      hadMigrations: true,
    };
  } finally {
    await connection.disconnect();
  }
}

export interface ModuleMigrationStatusEntry {
  /** Migration name (the SQL file's basename without extension). */
  name: string;
  /** Whether this migration has been applied to the database. */
  applied: boolean;
}

export interface ModuleMigrationStatusResult {
  /** The module whose status was checked. */
  moduleName: string;
  /** Count of migrations already applied. */
  applied: number;
  /** Count of migrations not yet applied. */
  pending: number;
  /** Every migration on disk with its applied flag, in order. */
  migrations: ModuleMigrationStatusEntry[];
  /** False when the module has no migrations directory yet. */
  hadMigrations: boolean;
}

/**
 * Report the migration status of a standalone module against its DATABASE_URL —
 * which of the module's own migration files have been applied and which are
 * still pending. Scoped to this module only: status is read from the tracking
 * table keyed by the module's name, the same key `runModuleMigration` records
 * under.
 */
export async function runModuleMigrationStatus(
  packageDir: string,
): Promise<ModuleMigrationStatusResult> {
  const moduleDir = locateModuleDir(packageDir);
  const manifest = readModuleManifest(moduleDir);

  const migrationsPath = join(
    moduleDir,
    manifest.paths?.migrations ?? DEFAULT_MODULE_PATHS.migrations,
  );
  if (!existsSync(migrationsPath)) {
    return {
      moduleName: manifest.name,
      applied: 0,
      pending: 0,
      migrations: [],
      hadMigrations: false,
    };
  }

  const dbConfig = resolveDatabaseConfig({});
  const logger = new Logger({ prefix: manifest.name, timestamp: false });
  const connection = new ConnectionManager(dbConfig, logger);
  const pool = await connection.connect();

  try {
    const tracker = new MigrationTracker(pool);
    await tracker.ensureTable();

    const discovered = discoverModuleMigrations(moduleDir);
    const appliedRows = await tracker.getApplied(manifest.name);
    const appliedNames = new Set(appliedRows.map((row) => row.name));

    const migrations = discovered.map((migration) => ({
      name: migration.name,
      applied: appliedNames.has(migration.name),
    }));

    return {
      moduleName: manifest.name,
      applied: migrations.filter((m) => m.applied).length,
      pending: migrations.filter((m) => !m.applied).length,
      migrations,
      hadMigrations: true,
    };
  } finally {
    await connection.disconnect();
  }
}
