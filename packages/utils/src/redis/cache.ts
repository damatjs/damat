/**
 * Redis Module - Cache Utilities
 *
 * Functions for caching data in Redis with automatic serialization.
 */

import type { Redis } from "./types";

const CACHE_PREFIX = "cache:";

/**
 * Get a cached value by key.
 *
 * @param client - Redis client instance
 * @param key - Cache key (automatically prefixed with "cache:")
 * @returns Parsed value or null if not found
 */
export async function cacheGet<T>(
  client: Redis,
  key: string,
): Promise<T | null> {
  const value = await client.get(CACHE_PREFIX + key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Set a cached value with optional TTL.
 *
 * @param client - Redis client instance
 * @param key - Cache key (automatically prefixed with "cache:")
 * @param value - Value to cache (automatically JSON serialized)
 * @param ttlSeconds - Time to live in seconds (default: 300)
 */
export async function cacheSet<T>(
  client: Redis,
  key: string,
  value: T,
  ttlSeconds: number = 300,
): Promise<void> {
  await client.setex(CACHE_PREFIX + key, ttlSeconds, JSON.stringify(value));
}

/**
 * Delete a cached value.
 *
 * @param client - Redis client instance
 * @param key - Cache key (automatically prefixed with "cache:")
 */
export async function cacheDelete(client: Redis, key: string): Promise<void> {
  await client.del(CACHE_PREFIX + key);
}

/**
 * Delete all cached values matching a pattern.
 *
 * @param client - Redis client instance
 * @param pattern - Pattern to match (e.g., "user:*")
 */
export async function cacheDeletePattern(
  client: Redis,
  pattern: string,
): Promise<void> {
  const keys = await client.keys(CACHE_PREFIX + pattern);
  if (keys.length > 0) {
    await client.del(...keys);
  }
}

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
export async function cacheGetRaw(
  client: Redis,
  key: string,
): Promise<string | null> {
  const value = await client.get(CACHE_PREFIX + key);
  return value || null;
}

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
  client: Redis,
  key: string,
  value: string,
  ttlSeconds?: number,
): Promise<void> {
  if (ttlSeconds) {
    await client.setex(CACHE_PREFIX + key, ttlSeconds, value);
  } else {
    await client.set(CACHE_PREFIX + key, value);
  }
}
