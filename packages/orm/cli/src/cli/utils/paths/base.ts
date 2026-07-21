import path from "node:path";

export interface PathOptions {
  cliPath?: string;
  moduleName?: string;
}

const DEFAULT_MODULES_DIR = "src/modules";

export function resolveBasePath(
  cliPath: string | undefined,
  configPath: string | undefined,
  defaultPath: string,
  cwd: string,
): string {
  if (cliPath) {
    return path.isAbsolute(cliPath) ? cliPath : path.join(cwd, cliPath);
  }

  if (configPath) {
    return path.isAbsolute(configPath)
      ? configPath
      : path.join(cwd, configPath);
  }

  return path.join(cwd, defaultPath);
}

//REMOVE THIS TODO:
export function getModulesDir(
  configModulesDir: string | undefined,
  cwd: string,
): string {
  return configModulesDir
    ? path.isAbsolute(configModulesDir)
      ? configModulesDir
      : path.join(cwd, configModulesDir)
    : path.join(cwd, DEFAULT_MODULES_DIR);
}

export { DEFAULT_MODULES_DIR };
