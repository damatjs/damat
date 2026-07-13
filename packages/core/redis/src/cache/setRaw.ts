import type { Redis } from "../types";
import { getRedis } from "../singleton";
import { CACHE_PREFIX } from "./constant";

// =============================================================================
// RAW STRING CACHE (no JSON serialization)
// =============================================================================

/**
 * Set a raw string value with optional TTL (no JSON serialization).
 * Useful for storing pre-serialized data or plain strings.
 *
 * @param client - Redis client instance
 * @param key - Cache key (automatically prefixed with "cache:")
 * @param value - Raw string value to cache
 * @param ttlSeconds - Time to live in seconds (optional, no expiry if not provided)
 */
export async function cacheSetRaw(
  key: string,
  value: string,
  ttlSeconds?: number,
  client?: Redis,
): Promise<void> {
  const redis = client || getRedis();
  if (ttlSeconds) {
    await redis.setex(CACHE_PREFIX + key, ttlSeconds, value);
  } else {
    await redis.set(CACHE_PREFIX + key, value);
  }
}
