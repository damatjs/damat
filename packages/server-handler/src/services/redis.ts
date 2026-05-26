import { initRedis, disconnectRedis, getRedis } from "@damatjs/utils";
import type { ILogger } from "@damatjs/logger";

export interface RedisConfig {
  enabled?: boolean;
  url?: string | undefined;
}

export async function initRedisService(config: RedisConfig, logger: ILogger): Promise<void> {
  if (!config.enabled) {
    return;
  }

  const url = config.url || process.env.REDIS_URL;
  if (!url) {
    logger.warn("Redis enabled but no URL configured, skipping");
    return;
  }

  initRedis({ url });
  logger.info("Redis connected", { url });
}

export async function closeRedis(): Promise<void> {
  await disconnectRedis();
}

export function getRedisClient() {
  return getRedis();
}
