import type { Redis } from "../types";
import { getRedis } from "../singleton";
import { CACHE_PREFIX } from './constant';

/**
 * Delete all cached values matching a pattern.
 *
 * @param client - Redis client instance
 * @param pattern - Pattern to match (e.g., "user:*")
 */
export async function cacheDeletePattern(pattern: string, client?: Redis): Promise<void> {
    const redis = client || getRedis();
    const keys = await redis.keys(CACHE_PREFIX + pattern);
    if (keys.length > 0) {
        await redis.del(...keys);
    }
}
