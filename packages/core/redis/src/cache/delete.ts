import type { Redis } from "../types";
import { getRedis } from "../singleton";
import { CACHE_PREFIX } from "./constant";

/**
 * Delete a cached value.
 *
 * @param client - Redis client instance
 * @param key - Cache key (automatically prefixed with "cache:")
 */
export async function cacheDelete(key: string, client?: Redis): Promise<void> {
  const redis = client || getRedis();
  await redis.del(CACHE_PREFIX + key);
}
