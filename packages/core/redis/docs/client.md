# Client lifecycle, factory, errors & types

Covers `src/RedisClient.ts`, `src/singleton.ts`, `src/client/`, `src/errors/`, and `src/types/`.

## Responsibility

Own the connection to Redis and hand a `Redis` (ioredis) instance to everything else. There are two acquisition models — a process-global **singleton** and a **standalone factory** — plus the `RedisClient` class that wraps ioredis with logging.

## Config types — `src/types/config.ts`

```ts
interface RedisConfig {
  url: string; // e.g. "redis://localhost:6379"
  maxRetriesPerRequest?: number; // default 3
  lazyConnect?: boolean; // default true
  options?: Partial<RedisOptions>; // spread onto the ioredis constructor
}

interface RedisClientConfig extends RedisConfig {
  logger?: ILogger; // defaults to console
  name?: string; // connection label for logs, default "default"
  debug?: boolean; // log "reconnecting" events, default false
}
```

`Redis` and `RedisOptions` are re-exported from `@damatjs/deps/ioredis` (`src/types/redis.ts`, `src/types/config.ts`).

Framework durability uses the singleton for one multiplexed subscriber and a
rebuildable coordination projection. Authenticated users need Redis ACL channel
patterns `&damat:*` and `&damat-events` in addition to their command and key
rules. Redis is never the canonical store for durable payloads or history.

## Factory — `src/client/factory.ts`

```ts
function createRetryStrategy(times: number): number; // min(times * 50, 2000)

function createRedisConnection(config: RedisConfig): Redis;
```

`createRedisConnection` builds the ioredis client:

```ts
new Redis(config.url, {
  maxRetriesPerRequest: config.maxRetriesPerRequest ?? 3,
  retryStrategy: createRetryStrategy,
  lazyConnect: config.lazyConnect ?? true,
  ...config.options, // caller options win (spread last)
});
```

`src/client/index.ts` adds the public, singleton-free helpers:

```ts
function createRedis(config: RedisConfig): Redis; // alias of createRedisConnection
async function disconnect(client: Redis): Promise<void>; // client.quit()
```

**Gotcha — `lazyConnect`.** Default `true` means no socket opens until the first command. In tests `createRedis(...).status === "wait"` until you call `.connect()` or issue a command (`client.test.ts`).

## `RedisClient` — `src/RedisClient.ts`

Class wrapper used by the singleton. It does **not** add caching/locking logic — it adds logging and a connection-state flag.

```ts
class RedisClient {
  constructor(config: RedisClientConfig);
  get client(): Redis; // underlying ioredis instance
  get isConnected(): boolean; // tracked via connect/close events
  connect(): Promise<void>; // redis.connect()
  disconnect(): Promise<void>; // redis.quit() + connected = false
  ping(): Promise<boolean>; // true iff reply === "PONG", never throws
}
```

Behavior:

1. Constructor calls `createRedisConnection(config)` and wires event handlers.
2. Event handlers log via `config.logger ?? console`:
   - `error` → `logger.error("Redis connection error", err, { name })`
   - `connect` → set `connected = true`, `logger.info`
   - `close` → set `connected = false`, `logger.warn`
   - `reconnecting` → `logger.debug` **only if** `debug: true`
3. `ping()` swallows errors and returns `false`, so it is safe as a health check.

## Singleton — `src/singleton.ts`

A module-level `globalClient: RedisClient | null`.

```ts
function initRedis(
  config?: RedisClientConfig,
  logger?: ILogger,
): RedisClient | null;
async function connectRedis(): Promise<Redis>;
function getRedis(): Redis;
function getRedisClient(): RedisClient;
function hasRedis(): boolean;
async function disconnectRedis(): Promise<void>;
```

- **`initRedis(config?)`** — if `config` is falsy, returns `null` and does nothing (lets callers do `initRedis(maybeConfig)` unconditionally). If a client already exists it logs a warning and `disconnect()`s the old one (fire-and-forget, errors ignored), then constructs and stores a new `RedisClient`.
- **`getRedis()` / `getRedisClient()`** — throw `RedisNotInitializedError` if `globalClient` is null; otherwise return the raw `Redis` / the wrapper.
- **`connectRedis()`** — throws if uninitialized; otherwise `connect()`s if needed, `PING`s, and returns the raw client. (The `if (!globalClient.client)` guard is effectively always false since `client` is constructed eagerly; the `ping()` is the meaningful step.)
- **`disconnectRedis()`** — disconnects and resets `globalClient` to `null` so `hasRedis()` becomes `false`.

## Errors — `src/errors/index.ts`

```ts
class RedisConnectionError extends Error {
  constructor(message, cause?: Error);
}
class RedisNotInitializedError extends Error {
  // default message: "Redis not initialized. Call initRedis() first."
}
```

`RedisNotInitializedError` is what every feature helper surfaces (indirectly via `getRedis()`) when used before `initRedis()` and without an explicit client. `RedisConnectionError` is exported for consumers but not thrown internally.

## Lifecycle recipes

Singleton (typical app):

```ts
import { initRedis, getRedis, disconnectRedis } from "@damatjs/redis";

initRedis({ url: process.env.REDIS_URL!, name: "app", debug: false });
await getRedis().ping();
// ... feature helpers just work ...
await disconnectRedis();
```

Standalone (scoped / tests / multiple connections):

```ts
import { createRedis, disconnect } from "@damatjs/redis";

const redis = createRedis({ url, lazyConnect: true });
await redis.connect();
await cacheSet("k", v, 60, redis); // pass as trailing arg
await disconnect(redis);
```

## Safe extension

- New connection options belong in `RedisConfig.options` (spread last, so they win) rather than new top-level fields, unless the field needs special handling.
- Keep `ping()` non-throwing — callers rely on it for health checks.
- If you add a method to `RedisClient`, mirror the event-driven `connected` bookkeeping rather than querying ioredis status ad hoc.
