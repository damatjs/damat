import type { Redis } from "./types";
import { getRedis } from "./client";

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

/**
 * Decrement a counter atomically.
 *
 * @param client - Redis client instance
 * @param key - Counter key
 * @param amount - Amount to decrement (default: 1)
 * @returns New counter value
 */
export async function decrementCounter(
  key: string,
  amount: number = 1,
  client?: Redis,
): Promise<number> {
  const redis = client || getRedis();
  return redis.decrby(key, amount);
}

export async function getCounter(key: string, client?: Redis): Promise<number> {
  const redis = client || getRedis();
  const value = await redis.get(key);
  return value ? parseInt(value, 10) : 0;
}

/**
 * Reset a counter to zero.
 *
 * @param client - Redis client instance
 * @param key - Counter key
 */
export async function resetCounter(key: string, client?: Redis): Promise<void> {
  const redis = client || getRedis();
  await redis.del(key);
}

/**
 * Set a counter to a specific value.
 *
 * @param client - Redis client instance
 * @param key - Counter key
 * @param value - Value to set
 * @param ttlSeconds - Optional TTL in seconds
 */
export async function setCounter(
  key: string,
  value: number,
  ttlSeconds?: number,
  client?: Redis,
): Promise<void> {
  const redis = client || getRedis();
  if (ttlSeconds) {
    await redis.setex(key, ttlSeconds, value.toString());
  } else {
    await redis.set(key, value.toString());
  }
}
