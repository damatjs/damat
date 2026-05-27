import { Redis, createRedis, RedisConfig } from "@damatjs/utils";
import { ILogger } from '../types';
import { getLogger } from './logger';

let globalRedis: Redis | null = null;

export function initRedis(config?: RedisConfig, logger?: ILogger): Redis | null {
  if (!config) {
    return null;
  }

  if (globalRedis) {
    logger?.warn("Redis already initialized, closing existing connection");
    globalRedis.quit().catch(() => { });
  }
  globalRedis = createRedis(config);
  return globalRedis;
}


export function getRedis(): Redis {
  if (!globalRedis) {
    const logger = getLogger();
    logger.error("Redis not initialized. Call initRedis() first.")
    throw new Error("Redis not initialized. Call initRedis() first.");
  }
  return globalRedis;
}

export function hasRedis(): boolean {
  return globalRedis !== null;
}

export async function disconnectRedis(): Promise<void> {
  if (globalRedis) {
    await globalRedis.quit();
    globalRedis = null;
  }
}

export async function disconnect(client: Redis): Promise<void> {
  await client.quit();
}
