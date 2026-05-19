import path from "node:path";
import fs from "node:fs";
import type { Logger } from "../types";

export interface DamatConfig {
  [name: string]: DamatConfigData
}

export interface DamatConfigData {
  resolve: string;
  id?: string;
  options?: Record<string, unknown>
}

const CONFIG_FILE = "damat.config.ts";

let cachedConfig: DamatConfig;

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
    const configData = configModule();
    //TODO: update the CONFIG on the main one
    const loaded = configData.modules.map(async (m: any) => {
      if (m.resolve) {
        const data = await import(m.resolve);
        const module: DamatConfig = {}
        module[data._schemaName] = m;
        return module;
      } else {
        return null
      }
    });
    const config = typeof loaded === "object" ? loaded : {};
    return setCache(config);
  } catch {
    return setCache({});
  }
}

export function clearConfigCache(): void {
  cachedConfig = {};
}

export function requireDatabaseUrl(logger: Logger): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("");
    logger.error("DATABASE_URL is not set.");
    console.log("");
    console.log("Make sure you have a .env file with:");
    console.log("DATABASE_URL=postgresql://user:password@localhost:5432/DB");
    console.log("");
    process.exit(1);
  }
  return url;
}
