import { join } from "node:path";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import type { ModuleAppConfig } from "./types";

const CONFIG_FILENAMES = ["module.config.ts", "module.config.js"];

/**
 * Load module.config.ts from a module package root.
 * Returns an empty config when the file doesn't exist — the runtime
 * defaults cover everything.
 */
export async function loadModuleConfig(
  packageDir: string,
): Promise<ModuleAppConfig> {
  for (const filename of CONFIG_FILENAMES) {
    const configPath = join(packageDir, filename);
    if (!existsSync(configPath)) continue;

    const exports = await import(pathToFileURL(configPath).href);
    const config = exports.default ?? exports.config;
    if (!config || typeof config !== "object") {
      throw new Error(
        `${filename} must default-export defineModuleConfig({...})`,
      );
    }
    return config as ModuleAppConfig;
  }
  return {};
}
