import type { Redis } from "../types";
import { getRedis } from "../singleton";
import { CACHE_PREFIX } from "./constant";

/**
 * Delete all cached values matching a pattern.
 *
 * Uses a cursor-driven SCAN loop instead of KEYS so large keyspaces are not
 * blocked by a single O(N) command.
 *
 * @param client - Redis client instance
 * @param pattern - Pattern to match (e.g., "user:*")
 */
export async function cacheDeletePattern(
  pattern: string,
  client?: Redis,
): Promise<void> {
  const redis = client || getRedis();
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      CACHE_PREFIX + pattern,
      "COUNT",
      100,
    );
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    cursor = nextCursor;
  } while (cursor !== "0");
}
