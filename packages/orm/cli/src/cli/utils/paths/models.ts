import path from "node:path";
import type { DamatConfig } from "../../config";
import type { PathOptions } from "./base";
import { getModulesDir } from "./base";

export function resolveModelsPath(
  options: PathOptions & { cliModelsDir?: string | undefined },
  config: DamatConfig,
  moduleName: string,
  cwd: string = process.cwd()
): string {
  if (options.cliModelsDir) {
    return path.isAbsolute(options.cliModelsDir)
      ? options.cliModelsDir
      : path.join(cwd, options.cliModelsDir);
  }

  if (config.modelsDir) {
    const baseDir = path.isAbsolute(config.modelsDir)
      ? config.modelsDir
      : path.join(cwd, config.modelsDir);
    return path.join(baseDir, moduleName);
  }

  const modulesDir = getModulesDir(config.modulesDir, cwd);
  return path.join(modulesDir, moduleName, "models");
}
