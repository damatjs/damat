/**
 * Redis-backed, opt-in read cache for ModelMethods
 *
 *   - a read is cached ONLY when the call passes `cache: true | { ttl, tags }`
 *     (nothing is cached by default);
 *   - every entry carries the implicit `model:<name>` tag;
 *   - every write (create/update/delete/…) invalidates that tag, so cached
 *     reads never outlive a mutation by more than the write's round-trip;
 *   - `invalidateCacheTags([...])` (re-exported from @damatjs/redis) is the
 *     manual reset for custom tags or cross-model groups.
 *
 * Redis being missing or down never breaks a read — it falls through to the
 * database with a debug log. Reads inside a transaction always hit the
 * database (a transaction must see its own writes).
 */

export * from "./buildCacheKey";
export * from "./constant";
export * from "./stableStringify";
export * from "./tag";
export * from "./taggedCache";
