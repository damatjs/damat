import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { AppConfig } from "./types";

const CONFIG_FILE = "damat.config.ts";
let cachedConfig: AppConfig | null = null;

export function loadConfig(cwd: string = process.cwd()): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = path.join(cwd, CONFIG_FILE);

  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  throw new Error(
    "Synchronous config loading is not supported. Use loadConfigAsync() instead.",
  );
}

export async function loadConfigAsync(
  cwd: string = process.cwd(),
): Promise<AppConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = path.join(cwd, CONFIG_FILE);

  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  try {
    const configUrl = pathToFileURL(path.resolve(configPath));
    const configModule = await import(configUrl.href);
    const config = configModule.default || configModule;

    if (!config.projectConfig) {
      throw new Error("Invalid config: missing projectConfig");
    }

    cachedConfig = config;
    return config;
  } catch (e: any) {
    throw new Error(`Failed to load config: ${e.message}`);
  }
}

export function clearConfigCache(): void {
  cachedConfig = null;
}
