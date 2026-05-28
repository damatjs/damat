import type { Redis } from "../types";
import { getRedis } from "../singleton";

/**
 * Increment a counter atomically.
 *
 * @param client - Redis client instance
 * @param key - Counter key
 * @param amount - Amount to increment (default: 1)
 * @param ttlSeconds - Optional TTL in seconds (only set on first increment)
 * @returns New counter value
 *
 * @example
 * ```typescript
 * // Track page views with daily expiry
 * const views = await incrementCounter(redis, `pageviews:${pageId}:${today}`, 1, 86400);
 * ```
 */
export async function incrementCounter(
  key: string,
  amount: number = 1,
  ttlSeconds?: number,
  client?: Redis,
): Promise<number> {
  const redis = client || getRedis();
  const newValue = await redis.incrby(key, amount);
  if (ttlSeconds) {
    await redis.expire(key, ttlSeconds);
  }
  return newValue;
}
