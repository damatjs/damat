import type { Redis } from "../types";
import { getRedis } from "../singleton";

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
