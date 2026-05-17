import path from "node:path";
import type { DamatConfig } from "../../config";
import type { PathOptions } from "./base";
import { getModulesDir } from "./base";

export function resolveMigrationsPath(
  options: PathOptions & { cliMigrationsDir?: string | undefined },
  config: DamatConfig,
  moduleName: string,
  cwd: string = process.cwd()
): string {
  if (options.cliMigrationsDir) {
    return path.isAbsolute(options.cliMigrationsDir)
      ? options.cliMigrationsDir
      : path.join(cwd, options.cliMigrationsDir);
  }

  if (config.migrationsDir) {
    const baseDir = path.isAbsolute(config.migrationsDir)
      ? config.migrationsDir
      : path.join(cwd, config.migrationsDir);
    return path.join(baseDir, moduleName);
  }

  const modulesDir = getModulesDir(config.modulesDir, cwd);
  return path.join(modulesDir, moduleName, "migrations");
}
