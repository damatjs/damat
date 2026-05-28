import type { Redis } from "../types";
import { getRedis } from "../singleton";
import { CACHE_PREFIX } from './constant';

/**
 * Set a cached value with optional TTL.
 *
 * @param client - Redis client instance
 * @param key - Cache key (automatically prefixed with "cache:")
 * @param value - Value to cache (automatically JSON serialized)
 * @param ttlSeconds - Time to live in seconds (default: 300)
 */
export async function cacheSet<T>(
    key: string,
    value: T,
    ttlSeconds: number = 300,
    client?: Redis,
): Promise<void> {
    const redis = client || getRedis();
    await redis.setex(CACHE_PREFIX + key, ttlSeconds, JSON.stringify(value));
}
