/**
 * Redis client for caching, rate limiting, and sessions
 *
 * Re-exports from @damatjs/utils/redis.
 *
 * @see packages/utils/src/redis/REDIS.md for documentation
 */

import { getProjectConfig } from '@damatjs/utils';
import { createRedis } from "@damatjs/utils/redis";
import type { Redis } from "@damatjs/utils/redis";

let redisInstance: Redis | null = null;

/**
 * Initialize Redis with configuration from project config.
 * Call this during app startup after loadAppConfig() has been called.
 */
export function initializeRedis() {
  const config = getProjectConfig();
  const url =
    config.redisUrl || process.env.REDIS_URL || "redis://localhost:6379";
  redisInstance = createRedis({ url });
}

export function getRedis(): Redis {
  if (!redisInstance) {
    throw new Error("Redis not initialized. Call initializeRedis() first.");
  }
  return redisInstance;
}

export async function disconnectRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
}
