import path from "node:path";
import fs from "node:fs";
import type { Logger } from "../types";

export interface DamatConfig {
  modulesDir?: string;
  migrationsDir?: string;
  typesDir?: string;
  modelsDir?: string;
}

const CONFIG_FILE = "damat.config.ts";

let cachedConfig: DamatConfig | undefined;

function setCache(config: DamatConfig): DamatConfig {
  cachedConfig = config;
  return config;
}

export async function loadConfig(cwd: string = process.cwd()): Promise<DamatConfig> {
  if (cachedConfig !== undefined) {
    return cachedConfig;
  }

  const configPath = path.join(cwd, CONFIG_FILE);

  if (!fs.existsSync(configPath)) {
    return setCache({});
  }

  try {
    const configModule = await import(configPath);
    const loaded = configModule.default ?? configModule;
    const config = typeof loaded === "object" ? loaded : {};
    return setCache(config);
  } catch {
    return setCache({});
  }
}

export function clearConfigCache(): void {
  cachedConfig = undefined;
}

export function requireDatabaseUrl(logger: Logger): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("");
    logger.error("DATABASE_URL is not set.");
    console.log("");
    console.log("Make sure you have a .env file with:");
    console.log("  DATABASE_URL=postgresql://user:password@localhost:5432/mydb");
    console.log("");
    process.exit(1);
  }
  return url;
}
