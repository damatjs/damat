import { existsSync } from "node:fs";
import { join } from "node:path";
import { createDiffMigration } from "@damatjs/orm-migration";
import { readModuleManifest } from "../manifest/read";
import { locateModuleDir } from "../runtime/locate";
import { DEFAULT_MODULE_PATHS } from "../manifest/types";

export interface ModuleMigrationResult {
  hasChanges: boolean;
  filePath?: string;
}

/** Diff a standalone module's declared models into its migrations directory. */
export async function createModuleMigration(
  packageDir: string,
): Promise<ModuleMigrationResult> {
  const moduleDir = locateModuleDir(packageDir);
  const manifest = readModuleManifest(moduleDir);
  const declaredModelsPath = join(
    moduleDir,
    manifest.paths?.models ?? DEFAULT_MODULE_PATHS.models,
  );
  const modelsPath = existsSync(declaredModelsPath)
    ? declaredModelsPath
    : moduleDir;
  const migrationsDir = join(
    moduleDir,
    manifest.paths?.migrations ?? DEFAULT_MODULE_PATHS.migrations,
  );
  const result = await createDiffMigration(
    manifest.name,
    modelsPath,
    {},
    {
      migrationsDir,
    },
  );
  return {
    hasChanges: result.hasChanges ?? Boolean(result.filePath),
    ...(result.filePath ? { filePath: result.filePath } : {}),
  };
}
