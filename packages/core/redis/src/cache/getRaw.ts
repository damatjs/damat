import type { Redis } from "../types";
import { getRedis } from "../singleton";
import { CACHE_PREFIX } from './constant';

// =============================================================================
// RAW STRING CACHE (no JSON serialization)
// =============================================================================

/**
 * Get a raw string value by key (no JSON parsing).
 * Useful for storing pre-serialized data or plain strings.
 *
 * @param client - Redis client instance
 * @param key - Cache key (automatically prefixed with "cache:")
 * @returns Raw string value or null if not found
 */
export async function cacheGetRaw(key: string, client?: Redis): Promise<string | null> {
    const redis = client || getRedis();
    const value = await redis.get(CACHE_PREFIX + key);
    return value || null;
}