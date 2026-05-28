import type { Redis } from "../types";
import { getRedis } from "../singleton";

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
