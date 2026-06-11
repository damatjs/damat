import { createDiffMigration } from "@damatjs/orm-migration";
import { readModuleManifest } from "../manifest/read";
import { locateModuleDir } from "../runtime/locate";

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
