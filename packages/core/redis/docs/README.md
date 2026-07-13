# @damatjs/redis — Internals

Maintainer-facing documentation. For usage see the [package README](../README.md).

This package is a thin, function-first layer over [ioredis](https://github.com/redis/ioredis). It is organized as one folder per concern; each folder is a barrel (`index.ts`) re-exporting a handful of one-export-per-file functions, plus a `constant.ts` holding the key prefix. The top-level `src/index.ts` re-exports everything, so the published surface is flat (no subpath exports).

## Module map

| File / dir | Responsibility | Detail doc |
| --- | --- | --- |
| `src/index.ts` | Barrel re-exporting every public symbol. | — |
| `src/RedisClient.ts` | `RedisClient` class: ioredis wrapper with logging + lifecycle. | [client.md](./client.md) |
| `src/singleton.ts` | Process-global client (`initRedis`/`getRedis`/`disconnectRedis`/...). | [client.md](./client.md) |
| `src/client/` | Standalone factory (`createRedis`, `createRedisConnection`, `createRetryStrategy`, `disconnect`). | [client.md](./client.md) |
| `src/errors/` | `RedisConnectionError`, `RedisNotInitializedError`. | [client.md](./client.md) |
| `src/types/` | `RedisConfig`, `RedisClientConfig`, rate-limit types, `Redis`/`RedisOptions` re-exports. | [client.md](./client.md) |
| `src/cache/` | JSON + raw string cache with TTL, plus tagged group invalidation. | [cache.md](./cache.md) |
| `src/rateLimit/` | Sliding-window rate limiter (single + multi). | [rate-limit.md](./rate-limit.md) |
| `src/session/` | Session CRUD + `SessionManager` (auto-extend). | [session.md](./session.md) |
| `src/lock/` | Distributed locks (Lua-guarded release/extend). | [lock.md](./lock.md) |
| `src/counter/` | Atomic counters. | [counter.md](./counter.md) |
| `src/queue/` | `RedisQueue` priority/delay job queue. | [queue.md](./queue.md) |
| `tests/` | Bun integration tests (require a live Redis). | — |

## Architecture overview

```
                ┌──────────────────────────┐
  initRedis ──► │  singleton.ts            │
                │  globalClient: RedisClient│◄── getRedis() / getRedisClient()
                └────────────┬─────────────┘
                             │ .client (ioredis Redis)
   feature helpers ──────────┤
   cache / rateLimit / ──────┘   client = client ?? getRedis()
   session / lock / counter
                             │
   RedisQueue / RedisClient  │  (hold their own Redis reference)
                             ▼
                   @damatjs/deps/ioredis  →  Redis server
```

### Two ways to get a client

1. **Singleton** (`singleton.ts`) — `initRedis(config)` constructs a `RedisClient` and stashes it in module-level `globalClient`. Every feature helper calls `getRedis()` when no explicit client is passed. This is the common path for an application that has exactly one Redis.
2. **Standalone** (`client/`) — `createRedis(config)` returns a bare ioredis `Redis` with no singleton involvement. Pass it as the trailing `client?` argument to any helper, or construct a `RedisClient`/`RedisQueue` with it.

### The trailing-`client` convention (important)

Every feature function takes `client?: Redis` as its **last** parameter and resolves it as:

```ts
const redis = client || getRedis();
```

So the ergonomic call `cacheGet("key")` uses the global client, while `cacheGet("key", myRedis)` overrides it. Note this means the public signatures are `(...args, client?)`, **not** `(client, ...args)`.

`RedisClient` (constructor) and `RedisQueue` (constructor) are the exceptions: they capture a `Redis` once and reuse it, falling back to `getRedis()` only at construction time.

## Control / data flow

- **Startup**: `initRedis({ url })` → `new RedisClient(config)` → `createRedisConnection(config)` → `new Redis(url, options)`. With `lazyConnect: true` (the default) no socket opens until the first command or an explicit `connect()`.
- **Per call**: helper resolves client → issues ioredis command(s) → maps the reply to a typed result. JSON helpers `JSON.parse`/`stringify`; parse failures return `null` rather than throwing.
- **Shutdown**: `disconnectRedis()` → `RedisClient.disconnect()` → `redis.quit()` and clears `globalClient`.

## Key-prefix registry

Each concern namespaces its keys to avoid collisions; counters and the explicit per-call keys are the exceptions.

| Concern | Prefix constant | Value |
| --- | --- | --- |
| Cache | `CACHE_PREFIX` | `cache:` |
| Cache tag index | `CACHE_TAG_PREFIX` (exported) | `cache-tag:` |
| Rate limit | `RATE_LIMIT_PREFIX` | `ratelimit:` |
| Session | `SESSION_PREFIX` | `session:` |
| Lock | `LOCK_PREFIX` (exported) | `lock:` |
| Counter | — | none (caller-controlled key) |
| Queue | inline | `queue:<name>:{jobs,pending,processing,completed,failed}` |

## Invariants & design decisions

- **Function-first, one export per file.** Each feature is a folder of tiny modules behind a barrel. Adding a feature = add a file + export it from the folder `index.ts`; the folder is already re-exported by `src/index.ts`.
- **Singleton is optional but global.** `getRedis()`/`connectRedis()` throw `RedisNotInitializedError` when `globalClient` is null. Re-`initRedis()` closes the previous connection (fire-and-forget) and replaces it.
- **No throwing on cache/session misses.** Missing keys and malformed JSON resolve to `null`.
- **Lua for lock safety.** `releaseLock`/`extendLock` compare the stored token before acting, so a process can never release/extend a lock it no longer owns (e.g. after TTL expiry).
- **Single-instance locks.** This is not Redlock; correctness assumes one logical Redis. For multi-node safety you would need a different algorithm.

## Tests

`tests/*.test.ts` are **integration** tests using `bun:test`; they call `initRedis({ url: process.env.REDIS_URL || "redis://localhost:6379" })` in `beforeAll` and need a reachable Redis.

## Detail docs

- [client.md](./client.md) — `RedisClient`, singleton, factory, errors, config types.
- [cache.md](./cache.md) — cache helpers.
- [rate-limit.md](./rate-limit.md) — sliding-window limiter.
- [session.md](./session.md) — session CRUD + `SessionManager`.
- [lock.md](./lock.md) — distributed locks.
- [counter.md](./counter.md) — atomic counters.
- [queue.md](./queue.md) — `RedisQueue`.
