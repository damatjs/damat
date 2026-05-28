import type { Redis } from "../types";
import { getRedis } from "../singleton";

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
