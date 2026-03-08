/**
 * Redis Module - Client Factory
 *
 * Creates and manages Redis client instances.
 */

import { Redis } from "@damatjs/deps/ioredis";
import type { RedisConfig } from "./types";

/**
 * Default retry strategy with exponential backoff
 */
function defaultRetryStrategy(times: number): number {
  const delay = Math.min(times * 50, 2000);
  return delay;
}

/**
 * Create a new Redis client with the provided configuration.
 *
 * @example
 * ```typescript
 * import { createRedis } from '@damatjs/utils';
 *
 * const redis = createRedis({
 *   url: process.env.REDIS_URL || 'redis://localhost:6379',
 * });
 *
 * await redis.set('key', 'value');
 * ```
 */
export function createRedis(config: RedisConfig): Redis {
  const client = new Redis(config.url, {
    maxRetriesPerRequest: config.maxRetriesPerRequest ?? 3,
    retryStrategy: defaultRetryStrategy,
    lazyConnect: config.lazyConnect ?? true,
    ...config.options,
  });

  client.on("error", (err: Error) => {
    console.error("Redis connection error:", err);
  });

  client.on("connect", () => {
    console.log("Redis connected");
  });

  return client;
}

/**
 * Disconnect a specific Redis client.
 */
export async function disconnect(client: Redis): Promise<void> {
  await client.quit();
}
