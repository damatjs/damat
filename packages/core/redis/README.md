# @damatjs/redis

> Redis utilities for the Damat backend: client lifecycle, caching, rate limiting, sessions, distributed locks, counters, and a Redis-backed job queue.

`@damatjs/redis` wraps [ioredis](https://github.com/redis/ioredis) (via `@damatjs/deps/ioredis`) with a small, function-first toolkit for the patterns a backend keeps reaching for. It owns a process-global Redis singleton so feature helpers (`cacheGet`, `checkRateLimit`, `acquireLock`, ...) can be called with no plumbing, while still accepting an explicit client when you need one. It sits in the `core` layer of the monorepo and is re-exported by `@damatjs/framework`; `@damatjs/workflow-engine` builds its workflow locks on top of it.

Part of the [Damat](../../../README.md) monorepo · [Full guide](../../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

```bash
bun add @damatjs/redis
```

Inside this monorepo it is a workspace dependency — reference it as `"@damatjs/redis": "*"` in the consuming package's `package.json`.

## When to use

Use it when you need any of:

- **Caching** — JSON or raw-string values with TTL (`cache:` prefix).
- **Rate limiting** — sliding-window limiter, single or multi-window (`ratelimit:`).
- **Sessions** — token → data with TTL, plus an auto-extend `SessionManager` (`session:`).
- **Distributed locks** — single-holder mutex with safe (token-checked) release/extend (`lock:`).
- **Counters** — atomic `INCR`/`DECR` with optional TTL (no prefix).
- **Job queue** — a priority + delay queue backed by sorted sets (`queue:<name>:*`).

Reach for raw `ioredis` (via `@damatjs/deps/ioredis` or the client this package returns) when you need commands these helpers do not cover.

It is **not** a full job framework (no worker loop, retry scheduler, or pub/sub) and **not** a Redlock multi-node implementation — locks are single-instance.

## Quick start

```ts
import {
  initRedis,
  cacheSet,
  cacheGet,
  withLock,
  disconnectRedis,
} from "@damatjs/redis";

// Initialize the process-global client once at startup.
initRedis({ url: process.env.REDIS_URL ?? "redis://localhost:6379" });

// Helpers default to the global client — no need to pass it around.
await cacheSet("user:123", { name: "Ada" }, 3600);
const user = await cacheGet<{ name: string }>("user:123"); // { name: "Ada" }

// Run a critical section under a distributed lock.
await withLock("process-order:123", async () => {
  // ...exclusive work...
});

// On shutdown.
await disconnectRedis();
```

Every feature helper takes an optional trailing `client?: Redis`. Pass one to bypass the singleton; omit it to use `getRedis()`:

```ts
import { createRedis, cacheGet } from "@damatjs/redis";

const redis = createRedis({ url: process.env.REDIS_URL! });
const value = await cacheGet<string>("key", redis);
```

## API

All exports are available from the single entry point `@damatjs/redis` (no subpath exports).

### Client lifecycle

| Export | Kind | Summary |
| --- | --- | --- |
| `RedisClient` | class | ioredis wrapper with logging, `connect`/`disconnect`/`ping`, `client`, `isConnected`. |
| `initRedis(config?, logger?)` | function | Create/replace the global client. Returns `null` if no config given. |
| `connectRedis()` | function | Connect the global client and `PING` it; returns the raw `Redis`. |
| `getRedis()` | function | Get the global raw `Redis` (throws `RedisNotInitializedError` if unset). |
| `getRedisClient()` | function | Get the global `RedisClient` wrapper. |
| `hasRedis()` | function | Whether the global client exists. |
| `disconnectRedis()` | function | Quit and clear the global client. |
| `createRedis(config)` | function | Create a standalone `Redis` (no singleton). |
| `createRedisConnection(config)` | function | Lower-level factory used by the above. |
| `createRetryStrategy(times)` | function | Default backoff: `min(times*50, 2000)` ms. |
| `disconnect(client)` | function | `client.quit()` for a standalone client. |

### Cache · prefix `cache:`

| Export | Kind | Summary |
| --- | --- | --- |
| `cacheSet(key, value, ttlSeconds=300, client?)` | function | JSON-serialize and `SETEX`. |
| `cacheGet<T>(key, client?)` | function | `GET` + `JSON.parse`; `null` on miss/parse error. |
| `cacheSetRaw(key, value, ttlSeconds?, client?)` | function | Store a raw string (`SETEX` or `SET`). |
| `cacheGetRaw(key, client?)` | function | `GET` raw string. |
| `cacheDelete(key, client?)` | function | `DEL` one key. |
| `cacheDeletePattern(pattern, client?)` | function | `KEYS cache:<pattern>` then `DEL`. |

### Rate limiting · prefix `ratelimit:`

| Export | Kind | Summary |
| --- | --- | --- |
| `checkRateLimit(id, windowMs, maxRequests, client?)` | function | Sliding-window check → `RateLimitResult`. |
| `checkMultiRateLimit(id, windows, client?)` | function | Check several windows → `MultiRateLimitResult`. |

### Sessions · prefix `session:`

| Export | Kind | Summary |
| --- | --- | --- |
| `setSession<T>(token, data, ttlSeconds, client?)` | function | JSON `SETEX`. |
| `getSession<T>(token, client?)` | function | Parse session, `null` on miss/error. |
| `extendSession(token, ttlSeconds, client?)` | function | `EXPIRE`; `true` if the key existed. |
| `deleteSession(token, client?)` | function | `DEL` the session. |
| `SessionManager<T>` | class | Wrapper with auto-extend-on-access (`get`/`set`/`delete`/`touch`/`refresh`). |
| `createSessionManager<T>(options?, client?)` | function | Factory for `SessionManager`. |

### Distributed locks · prefix `lock:`

| Export | Kind | Summary |
| --- | --- | --- |
| `acquireLock(key, ttlMs=10000, client?)` | function | `SET NX PX`; returns a token or `null`. |
| `releaseLock(key, lockValue, client?)` | function | Token-checked delete (Lua); `true` if released. |
| `extendLock(key, lockValue, ttlMs, client?)` | function | Token-checked `PEXPIRE` (Lua). |
| `isLocked(key, client?)` | function | Whether the lock key exists. |
| `withLock<T>(key, fn, ttlMs=10000, client?)` | function | Acquire → run `fn` → release in `finally`. |
| `LOCK_PREFIX` | const | `"lock:"`. |

### Counters · no prefix

| Export | Kind | Summary |
| --- | --- | --- |
| `incrementCounter(key, amount=1, ttlSeconds?, client?)` | function | `INCRBY` (+ optional `EXPIRE`). |
| `decrementCounter(key, amount=1, client?)` | function | `DECRBY`. |
| `getCounter(key, client?)` | function | Parsed int, `0` if missing. |
| `setCounter(key, value, ttlSeconds?, client?)` | function | `SET`/`SETEX`. |
| `resetCounter(key, client?)` | function | `DEL`. |

### Queue · prefix `queue:<name>:`

| Export | Kind | Summary |
| --- | --- | --- |
| `RedisQueue<TData>` | class | Priority + delay queue (`enqueue`/`dequeue`/`updateStatus`/`getJob`/`cancelJob`/`getStats`/`clear`). |
| `PRIORITY_SCORES` | const | `{ critical:4, high:3, normal:2, low:1 }`. |

### Errors & types

| Export | Kind | Summary |
| --- | --- | --- |
| `RedisConnectionError` | class | Connection failure (carries `cause`). |
| `RedisNotInitializedError` | class | Thrown by `getRedis`/`connectRedis` before `initRedis`. |
| `RedisConfig`, `RedisClientConfig` | types | Connection config (see [client internals](./docs/client.md)). |
| `RateLimitResult`, `RateLimitWindow`, `MultiRateLimitResult` | types | Rate-limit shapes. |
| `QueueJob<TData>`, `QueueStats` | types | Queue shapes. |
| `Redis`, `RedisOptions` | types | Re-exported from `@damatjs/deps/ioredis`. |

## How it fits

**Depends on**

- `@damatjs/deps` — supplies `ioredis` via the `@damatjs/deps/ioredis` subpath.
- `@damatjs/logger` — `ILogger` used by `RedisClient` for connection events.

**Depended on by (in repo)**

- `@damatjs/framework` — re-exports this package (`packages/framework/src/services/redis.ts`).
- `@damatjs/workflow-engine` — builds workflow locks on `acquireLock`/`releaseLock`/`extendLock`/`isLocked`.

## Documentation

- [Internals (maintainers)](./docs/README.md)
- [Full guide](../../../docs/GUIDE.md)

## License

MIT
