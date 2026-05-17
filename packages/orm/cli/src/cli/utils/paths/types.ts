import path from "node:path";
import type { DamatConfig } from "../../config";
import type { PathOptions } from "./base";
import { getModulesDir } from "./base";

export function resolveTypesPath(
  options: PathOptions & { cliTypesDir?: string | undefined },
  config: DamatConfig,
  moduleName: string,
  cwd: string = process.cwd()
): string {
  if (options.cliTypesDir) {
    return path.isAbsolute(options.cliTypesDir)
      ? options.cliTypesDir
      : path.join(cwd, options.cliTypesDir);
  }

  if (config.typesDir) {
    const baseDir = path.isAbsolute(config.typesDir)
      ? config.typesDir
      : path.join(cwd, config.typesDir);
    return path.join(baseDir, moduleName, "common");
  }

  const modulesDir = getModulesDir(config.modulesDir, cwd);
  return path.join(modulesDir, moduleName, "types", "common");
}
