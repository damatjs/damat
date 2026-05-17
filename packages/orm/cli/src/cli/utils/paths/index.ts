import path from "node:path";
import type { DamatConfig } from "../../config";

export { DEFAULT_MODULES_DIR } from "./base";
export { resolveModelsPath } from "./models";
export { resolveMigrationsPath } from "./migrations";
export { resolveTypesPath } from "./types";

export interface ResolvedPaths {
  modelsDir: string;
  migrationsDir: string;
  typesDir: string;
  modulesDir: string;
}

export function resolvePaths(
  modulesDir: string | undefined,
  config: DamatConfig,
  moduleName?: string,
  cwd: string = process.cwd()
): ResolvedPaths {
  const resolvedModulesDir = resolveModuleBase(modulesDir, config.modulesDir, cwd);

  return {
    modulesDir: resolvedModulesDir,
    modelsDir: moduleName ? path.join(resolvedModulesDir, moduleName, "models") : resolvedModulesDir,
    migrationsDir: moduleName ? path.join(resolvedModulesDir, moduleName, "migrations") : resolvedModulesDir,
    typesDir: moduleName ? path.join(resolvedModulesDir, moduleName, "types", "common") : resolvedModulesDir,
  };
}

function resolveModuleBase(
  cliPath: string | undefined,
  configPath: string | undefined,
  cwd: string
): string {
  if (cliPath) {
    return path.isAbsolute(cliPath) ? cliPath : path.join(cwd, cliPath);
  }

  if (configPath) {
    return path.isAbsolute(configPath) ? configPath : path.join(cwd, configPath);
  }

  return path.join(cwd, "src/modules");
}
