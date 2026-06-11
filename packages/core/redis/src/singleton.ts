import type { Redis, RedisClientConfig } from "./types";
import { RedisClient } from "./RedisClient";
import { RedisNotInitializedError } from "./errors";
import { ILogger } from '@damatjs/logger';

let globalClient: RedisClient | null = null;

export function initRedis(config?: RedisClientConfig, logger?: ILogger): RedisClient | null {
  if (!config) {
    return null;
  }

  if (globalClient) {
    (logger ?? config.logger)?.warn("Redis already initialized, closing existing connection");
    globalClient.disconnect().catch(() => { });
  }
  globalClient = new RedisClient(config);
  return globalClient;
}

export async function connectRedis(): Promise<Redis> {
  if (!globalClient) {
    throw new RedisNotInitializedError();
  }

  if (!globalClient.client)
    await globalClient.connect();

  await globalClient.client.ping()
  return globalClient.client;
}

export function getRedis(): Redis {
  if (!globalClient) {
    throw new RedisNotInitializedError();
  }
  return globalClient.client;
}

export function getRedisClient(): RedisClient {
  if (!globalClient) {
    throw new RedisNotInitializedError();
  }
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
