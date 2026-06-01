import path from "node:path";
import fs from "node:fs";
import type { ConfigLoader } from "./types";
import { ConfigLoadError } from "./errors";

let cachedConfig: unknown = null;

export function clearConfigCache(): void {
  cachedConfig = null;
}

export async function loadConfig<T = unknown>(
  loaderConfig: ConfigLoader | undefined,
  cwd: string = process.cwd()
): Promise<T | null> {
  if (cachedConfig !== null) {
    return cachedConfig as T;
  }

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
        cachedConfig = config;
        return config as T;
      }

      const moduleUrl = `file://${filePath}?t=${Date.now()}`;
      const mod = await import(moduleUrl);
      const config = mod.default ?? mod;

      cachedConfig = typeof config === "function" ? await config() : config;

      return cachedConfig as T;
    } catch (error) {
      throw new ConfigLoadError(filePath, error instanceof Error ? error : undefined);
    }
  }

  return null;
}

export function withConfig<T extends Record<string, unknown> = Record<string, unknown>>(
  configLoader: ConfigLoader | undefined
): {
  get: () => Promise<T | null>;
  clear: () => void;
} {
  return {
    get: async () => loadConfig<T>(configLoader),
    clear: clearConfigCache,
  };
}
