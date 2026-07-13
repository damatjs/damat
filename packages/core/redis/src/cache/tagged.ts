import type { Redis } from "../types";
import { getRedis } from "../singleton";
import { CACHE_PREFIX } from "./constant";

/** Redis SET holding the cache keys that carry a tag ("cache-tag:<tag>"). */
export const CACHE_TAG_PREFIX = "cache-tag:";

/**
 * Tag sets are refreshed to live at least this long on every write, so a
 * quiet tag doesn't lose its membership index while entries are still alive.
 * Cached entries with a TTL beyond this can outlive their tag set and then
 * only expire by time — keep entry TTLs below it.
 */
const TAG_SET_MIN_TTL_SECONDS = 24 * 60 * 60;

/**
 * Set a cached value (like {@link cacheSet}) and index it under one or more
 * tags so the whole group can be invalidated at once with
 * {@link invalidateCacheTags} — the Next.js `revalidateTag` model.
 */
export async function cacheSetTagged<T>(
    key: string,
    value: T,
    ttlSeconds: number = 300,
    tags: string[] = [],
    client?: Redis,
): Promise<void> {
    const redis = client || getRedis();
    await redis.setex(CACHE_PREFIX + key, ttlSeconds, JSON.stringify(value));
    for (const tag of tags) {
        const tagKey = CACHE_TAG_PREFIX + tag;
        await redis.sadd(tagKey, key);
        await redis.expire(tagKey, Math.max(ttlSeconds, TAG_SET_MIN_TTL_SECONDS));
    }
}

/**
 * Delete every cached entry carrying any of the given tags (and the tag
 * indexes themselves). Returns how many cache entries were deleted. Members
 * that already expired are counted out automatically (DEL of a missing key
 * is a no-op).
 */
export async function invalidateCacheTags(
    tags: string[],
    client?: Redis,
): Promise<number> {
    const redis = client || getRedis();
    let removed = 0;
    for (const tag of tags) {
        const tagKey = CACHE_TAG_PREFIX + tag;
        const members = await redis.smembers(tagKey);
        if (members.length > 0) {
            removed += await redis.del(...members.map((m) => CACHE_PREFIX + m));
        }
        await redis.del(tagKey);
    }
    return removed;
}
