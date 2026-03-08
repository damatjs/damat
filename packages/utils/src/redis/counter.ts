/**
 * Redis Module - Atomic Counters
 *
 * Functions for managing atomic counters in Redis.
 */

import type { Redis } from "./types";

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
  client: Redis,
  key: string,
  amount: number = 1,
  ttlSeconds?: number,
): Promise<number> {
  const newValue = await client.incrby(key, amount);
  if (ttlSeconds) {
    await client.expire(key, ttlSeconds);
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
  client: Redis,
  key: string,
  amount: number = 1,
): Promise<number> {
  return client.decrby(key, amount);
}

/**
 * Get current counter value.
 *
 * @param client - Redis client instance
 * @param key - Counter key
 * @returns Current counter value (0 if key doesn't exist)
 */
export async function getCounter(client: Redis, key: string): Promise<number> {
  const value = await client.get(key);
  return value ? parseInt(value, 10) : 0;
}

/**
 * Reset a counter to zero.
 *
 * @param client - Redis client instance
 * @param key - Counter key
 */
export async function resetCounter(client: Redis, key: string): Promise<void> {
  await client.del(key);
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
  client: Redis,
  key: string,
  value: number,
  ttlSeconds?: number,
): Promise<void> {
  if (ttlSeconds) {
    await client.setex(key, ttlSeconds, value.toString());
  } else {
    await client.set(key, value.toString());
  }
}
