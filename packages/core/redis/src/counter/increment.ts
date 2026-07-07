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
  if (!ttlSeconds) {
    return redis.incrby(key, amount);
  }
  // TTL is armed only when the key has none yet, so steady increment traffic
  // cannot keep the counter alive past its intended expiry.
  const script = `
    local value = redis.call("incrby", KEYS[1], ARGV[1])
    if redis.call("ttl", KEYS[1]) < 0 then
      redis.call("expire", KEYS[1], ARGV[2])
    end
    return value
  `;
  return (await redis.eval(script, 1, key, amount, ttlSeconds)) as number;
}
