import path from "node:path";
import fs from "node:fs";
import { ConfigLoadError } from "../errors";
import type { ConfigLoader } from "../types";

export async function loadConfig<T = unknown>(
  loaderConfig: ConfigLoader | undefined,
  cwd: string,
): Promise<T | null> {
  if (!loaderConfig?.file) {
    return null;
  }

  const files = Array.isArray(loaderConfig.file)
    ? loaderConfig.file
    : [loaderConfig.file];

  for (const file of files) {
    const filePath = path.isAbsolute(file) ? file : path.join(cwd, file);

    if (!fs.existsSync(filePath)) {
      continue;
    }

    try {
      if (loaderConfig.load) {
        const config = await loaderConfig.load(filePath);
        return config as T;
      }

      const moduleUrl = `file://${filePath}?t=${Date.now()}`;
      const mod = await import(moduleUrl);
      const config = mod.default ?? mod;

      return (typeof config === "function" ? await config() : config) as T;
    } catch (error) {
      if (error instanceof Error) {
        throw new ConfigLoadError(filePath, error);
      }
      throw new ConfigLoadError(filePath);
    }
  }

  return null;
}
