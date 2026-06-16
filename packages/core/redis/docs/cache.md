# Cache

Covers `src/cache/` (`constant.ts`, `set.ts`, `get.ts`, `setRaw.ts`, `getRaw.ts`, `delete.ts`, `deletePattern.ts`).

## Responsibility

Key/value caching with TTL. Two flavors: **JSON** (serialize/parse objects) and **raw** (store strings verbatim). All keys are namespaced with `CACHE_PREFIX = "cache:"` (`constant.ts`), applied automatically — callers pass the bare key.

## Signatures

```ts
// JSON
async function cacheSet<T>(key: string, value: T, ttlSeconds = 300, client?: Redis): Promise<void>;
async function cacheGet<T>(key: string, client?: Redis): Promise<T | null>;

// Raw string (no serialization)
async function cacheSetRaw(key: string, value: string, ttlSeconds?: number, client?: Redis): Promise<void>;
async function cacheGetRaw(key: string, client?: Redis): Promise<string | null>;

// Delete
async function cacheDelete(key: string, client?: Redis): Promise<void>;
async function cacheDeletePattern(pattern: string, client?: Redis): Promise<void>;
```

## Behavior

- **`cacheSet`** — `SETEX cache:<key> <ttlSeconds> JSON.stringify(value)`. TTL defaults to **300 s**; there is no "no-expiry" path for JSON (use `cacheSetRaw` without a TTL for that).
- **`cacheGet`** — `GET cache:<key>`; returns `null` on miss. On a hit it `JSON.parse`s inside a `try/catch` and returns `null` if parsing fails (e.g. a non-JSON value written by another writer). No exception escapes.
- **`cacheSetRaw`** — if `ttlSeconds` is truthy → `SETEX`; otherwise `SET` (persists with no expiry). Note a `ttlSeconds` of `0` is falsy and therefore takes the no-expiry branch.
- **`cacheGetRaw`** — `GET cache:<key>`, returning the string or `null`.
- **`cacheDelete`** — `DEL cache:<key>`; a no-op (no error) for a missing key.
- **`cacheDeletePattern`** — `KEYS cache:<pattern>` then `DEL` of every match (only if any matched). The pattern is relative to the prefix, e.g. `cacheDeletePattern("user:*")` scans `cache:user:*`.

## Example

```ts
await cacheSet("user:123", { name: "Ada" });          // 5-min TTL
const u = await cacheGet<{ name: string }>("user:123"); // { name: "Ada" }

await cacheSetRaw("html:home", "<h1>Hi</h1>", 60);     // pre-rendered string
await cacheGetRaw("html:home");                         // "<h1>Hi</h1>"

await cacheDelete("user:123");
await cacheDeletePattern("user:*");                     // wipe all cached users
```

## Gotchas

- **`KEYS` is O(N)** over the keyspace and blocks Redis. `cacheDeletePattern` is fine for occasional invalidation but avoid it on hot paths / huge keyspaces; prefer a `SCAN`-based approach or a known key set for high-frequency use.
- **JSON round-trip loses types** — `Date`, `Map`, `BigInt`, `undefined` do not survive `JSON.stringify`/`parse`. Use `cacheSetRaw` with your own encoding when that matters.
- **Parse errors are silent** — `cacheGet` returns `null` for malformed JSON, indistinguishable from a miss.
- **TTL `0`** in `cacheSetRaw` means "no expiry", not "expire immediately".

## Safe extension

Add new cache operations as one-export-per-file modules under `src/cache/` and re-export them from `src/cache/index.ts`. Reuse `CACHE_PREFIX` so keys stay namespaced; do not hard-code `"cache:"`.
