# Cache

Covers `src/cache/` (`constant.ts`, `set.ts`, `get.ts`, `setRaw.ts`, `getRaw.ts`, `delete.ts`, `deletePattern.ts`, `tagged.ts`).

## Responsibility

Key/value caching with TTL. Two flavors: **JSON** (serialize/parse objects) and **raw** (store strings verbatim), plus a **tagged** layer (`tagged.ts`) that indexes entries under tags so a whole group can be invalidated at once — the Next.js `revalidateTag` model. All keys are namespaced with `CACHE_PREFIX = "cache:"` (`constant.ts`), applied automatically — callers pass the bare key. Tag index sets are Redis SETs keyed `CACHE_TAG_PREFIX = "cache-tag:"` + tag (exported from `tagged.ts`).

## Signatures

```ts
// JSON
async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds = 300,
  client?: Redis,
): Promise<void>;
async function cacheGet<T>(key: string, client?: Redis): Promise<T | null>;

// Raw string (no serialization)
async function cacheSetRaw(
  key: string,
  value: string,
  ttlSeconds?: number,
  client?: Redis,
): Promise<void>;
async function cacheGetRaw(key: string, client?: Redis): Promise<string | null>;

// Delete
async function cacheDelete(key: string, client?: Redis): Promise<void>;
async function cacheDeletePattern(
  pattern: string,
  client?: Redis,
): Promise<void>;

// Tagged (group invalidation)
async function cacheSetTagged<T>(
  key: string,
  value: T,
  ttlSeconds = 300,
  tags: string[] = [],
  client?: Redis,
): Promise<void>;
async function invalidateCacheTags(
  tags: string[],
  client?: Redis,
): Promise<number>;
```

## Behavior

- **`cacheSet`** — `SETEX cache:<key> <ttlSeconds> JSON.stringify(value)`. TTL defaults to **300 s**; there is no "no-expiry" path for JSON (use `cacheSetRaw` without a TTL for that).
- **`cacheGet`** — `GET cache:<key>`; returns `null` on miss. On a hit it `JSON.parse`s inside a `try/catch` and returns `null` if parsing fails (e.g. a non-JSON value written by another writer). No exception escapes.
- **`cacheSetRaw`** — if `ttlSeconds` is truthy → `SETEX`; otherwise `SET` (persists with no expiry). Note a `ttlSeconds` of `0` is falsy and therefore takes the no-expiry branch.
- **`cacheGetRaw`** — `GET cache:<key>`, returning the string or `null`.
- **`cacheDelete`** — `DEL cache:<key>`; a no-op (no error) for a missing key.
- **`cacheDeletePattern`** — cursor-driven `SCAN ... MATCH cache:<pattern> COUNT 100` loop, `DEL`-ing each batch of matches, until the cursor returns to `0`. The pattern is relative to the prefix, e.g. `cacheDeletePattern("user:*")` scans `cache:user:*`.
- **`cacheSetTagged`** — writes the entry exactly like `cacheSet` (`SETEX cache:<key>`), then for each tag `SADD cache-tag:<tag> <key>` + `EXPIRE cache-tag:<tag> max(ttlSeconds, 24 h)`. The tag set stores **bare** keys (no `cache:` prefix). Every write refreshes the tag set's TTL to at least **24 h** (`TAG_SET_MIN_TTL_SECONDS`), so a quiet tag doesn't lose its membership index while entries are still alive.
- **`invalidateCacheTags`** — per tag: `SMEMBERS cache-tag:<tag>`, `DEL` every member (re-prefixed with `cache:`), then `DEL` the tag set itself. Returns how many cache entries were actually deleted; members that already expired count out automatically (`DEL` of a missing key is a no-op).

## Example

```ts
await cacheSet("user:123", { name: "Ada" }); // 5-min TTL
const u = await cacheGet<{ name: string }>("user:123"); // { name: "Ada" }

await cacheSetRaw("html:home", "<h1>Hi</h1>", 60); // pre-rendered string
await cacheGetRaw("html:home"); // "<h1>Hi</h1>"

await cacheDelete("user:123");
await cacheDeletePattern("user:*"); // wipe all cached users

await cacheSetTagged("user:123", { name: "Ada" }, 300, ["users"]);
await invalidateCacheTags(["users"]); // deletes every entry tagged "users"
```

## Gotchas

- **`cacheDeletePattern` is incremental, not atomic** — it `SCAN`s in batches (never blocking Redis the way `KEYS` would), so keys written mid-scan may or may not be caught; treat it as best-effort invalidation.
- **JSON round-trip loses types** — `Date`, `Map`, `BigInt`, `undefined` do not survive `JSON.stringify`/`parse`. Use `cacheSetRaw` with your own encoding when that matters.
- **Parse errors are silent** — `cacheGet` returns `null` for malformed JSON, indistinguishable from a miss.
- **TTL `0`** in `cacheSetRaw` means "no expiry", not "expire immediately".
- **Entry TTLs beyond 24 h can outlive their tag index** — each `cacheSetTagged` sets the tag set's expiry to `max(ttlSeconds, 24 h)`, so a later short-TTL write pulls a tag set back down to 24 h even if an earlier long-TTL entry is still alive. If the tag then goes quiet, `invalidateCacheTags` can no longer find that entry and it only expires by time. Keep tagged-entry TTLs at or below 24 h.
- **Tag invalidation is not atomic** — `SMEMBERS` and the `DEL`s are separate commands, so a `cacheSetTagged` racing an `invalidateCacheTags` can land a fresh entry that survives. Treat it as best-effort invalidation, like `cacheDeletePattern`.

## Safe extension

Add new cache operations as one-export-per-file modules under `src/cache/` and re-export them from `src/cache/index.ts`. Reuse `CACHE_PREFIX` (and `CACHE_TAG_PREFIX` for tag indexes) so keys stay namespaced; do not hard-code `"cache:"`.
