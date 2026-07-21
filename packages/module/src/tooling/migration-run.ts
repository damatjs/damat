import { existsSync } from "node:fs";
import { join } from "node:path";
import { runMigrations } from "@damatjs/orm-migration";
import { ConnectionManager } from "@damatjs/orm-connector";
import { Logger } from "@damatjs/logger";
import { readModuleManifest } from "../manifest/read";
import { locateModuleDir } from "../runtime/locate";
import { resolveDatabaseConfig } from "../harness/database";
import { DEFAULT_MODULE_PATHS } from "../manifest/types";

export interface RunModuleMigrationResult {
  moduleName: string;
  applied: string[];
  pending: string[];
  success: boolean;
  error?: Error;
  hadMigrations: boolean;
}

/** Apply only a standalone module's declared migrations to DATABASE_URL. */
export async function runModuleMigration(
  packageDir: string,
): Promise<RunModuleMigrationResult> {
  const moduleDir = locateModuleDir(packageDir);
  const manifest = readModuleManifest(moduleDir);
  const migrations = join(
    moduleDir,
    manifest.paths?.migrations ?? DEFAULT_MODULE_PATHS.migrations,
  );
  if (!existsSync(migrations)) {
    return {
      moduleName: manifest.name,
      applied: [],
      pending: [],
      success: true,
      hadMigrations: false,
    };
  }
  const connection = new ConnectionManager(
    resolveDatabaseConfig({}),
    new Logger({ prefix: manifest.name, timestamp: false }),
  );
  const pool = await connection.connect();
  try {
    const results = await runMigrations(pool, {
      [manifest.name]: {
        id: manifest.name,
        name: manifest.name,
        path: moduleDir,
        resolve: moduleDir,
        migrations,
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
