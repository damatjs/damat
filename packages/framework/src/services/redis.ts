import {
  initRedis as initRedisCore,
  RedisClient,
  RedisClientConfig,
} from "@damatjs/redis";
import type { Redis } from "@damatjs/redis";
import type { ILogger } from "../types";
import { getLogger } from "./logger";

let globalClient: RedisClient | null = null;

export type { Redis };

export function initRedis(config?: RedisClientConfig, logger?: ILogger): RedisClient | null {
  if (!config) {
    return null;
  }

  if (globalClient) {
    logger?.warn("Redis already initialized, closing existing connection");
    globalClient.disconnect().catch(() => { });
  }

  globalClient = initRedisCore({
    ...config,
    logger: logger ?? getLogger(),
  });

  return globalClient;
}

export function getRedis(): Redis {
  if (!globalClient) {
    const logger = getLogger();
    logger.error("Redis not initialized. Call initRedis() first.");
    throw new Error("Redis not initialized. Call initRedis() first.");
  }
  return globalClient.client;
}

export function getRedisClient(): RedisClient | null {
  return globalClient;
}

export function hasRedis(): boolean {
  return globalClient !== null;
}

export async function disconnectRedis(): Promise<void> {
  if (globalClient) {
    await globalClient.disconnect();
    globalClient = null;
  }
}

export async function disconnect(client: Redis): Promise<void> {
  await client.quit();
}
