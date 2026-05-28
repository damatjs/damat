import type { Redis } from "../types";
import { getRedis } from "../singleton";
import { CACHE_PREFIX } from './constant';

/**
 * Get a cached value by key.
 *
 * @param client - Redis client instance
 * @param key - Cache key (automatically prefixed with "cache:")
 * @returns Parsed value or null if not found
 */
export async function cacheGet<T>(key: string, client?: Redis): Promise<T | null> {
    const redis = client || getRedis();
    const value = await redis.get(CACHE_PREFIX + key);
    if (!value) return null;
    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
}
