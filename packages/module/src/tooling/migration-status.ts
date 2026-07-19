import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  discoverModuleMigrations,
  MigrationTracker,
} from "@damatjs/orm-migration";
import { ConnectionManager } from "@damatjs/orm-connector";
import { Logger } from "@damatjs/logger";
import { readModuleManifest } from "../manifest/read";
import { locateModuleDir } from "../runtime/locate";
import { resolveDatabaseConfig } from "../harness/database";
import { DEFAULT_MODULE_PATHS } from "../manifest/types";

export interface ModuleMigrationStatusResult {
  moduleName: string;
  applied: number;
  pending: number;
  migrations: Array<{ name: string; applied: boolean }>;
  hadMigrations: boolean;
}

/** Inspect a standalone module's declared migrations without applying them. */
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
  const connection = new ConnectionManager(
    resolveDatabaseConfig({}),
    new Logger({ prefix: manifest.name, timestamp: false }),
  );
  const pool = await connection.connect();
  try {
    const tracker = new MigrationTracker(pool);
    await tracker.ensureTable();
    const discovered = discoverModuleMigrations({
      resolve: moduleDir,
      migrations: migrationsPath,
    });
    const appliedNames = new Set(
      (await tracker.getApplied(manifest.name)).map((row) => row.name),
    );
    const migrations = discovered.map((migration) => ({
      name: migration.name,
      applied: appliedNames.has(migration.name),
    }));
    return {
      moduleName: manifest.name,
      applied: migrations.filter((item) => item.applied).length,
      pending: migrations.filter((item) => !item.applied).length,
      migrations,
      hadMigrations: true,
    };
  } finally {
    await connection.disconnect();
  }
}
