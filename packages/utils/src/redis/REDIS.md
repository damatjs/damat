# Redis Module

Redis client utilities for caching, rate limiting, sessions, distributed locks, and atomic counters.

## Directory Structure

```
redis/
├── types.ts      # Type definitions (RedisConfig, RateLimitResult, etc.)
├── client.ts     # createRedis() factory and connection management
├── cache.ts      # Cache utilities (get, set, delete, deletePattern)
├── rateLimit.ts  # Rate limiting (checkRateLimit, checkMultiRateLimit)
├── session.ts    # Session storage (get, set, delete, extend)
├── lock.ts       # Distributed locks (acquire, release, withLock)
├── counter.ts    # Atomic counters (increment, decrement, get, set)
├── index.ts      # Re-exports all public APIs
└── REDIS.md      # This documentation
```

## Usage

### Creating a Redis Client

```typescript
import { createRedis } from "@damatjs/utils";

// Create a Redis client with configuration
const redis = createRedis({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

// Use the client
await redis.set("key", "value");
const value = await redis.get("key");

// Disconnect when done
await disconnect(redis);
```

### Caching

```typescript
import {
  createRedis,
  cacheGet,
  cacheSet,
  cacheDelete,
} from "@damatjs/utils";

const redis = createRedis({ url: "redis://localhost:6379" });

// Cache with 5 minute TTL (default)
await cacheSet(redis, "user:123", { name: "John", email: "john@example.com" });

// Cache with custom TTL (1 hour)
await cacheSet(redis, "user:123", userData, 3600);

// Get cached value
const user = await cacheGet<User>(redis, "user:123");

// Delete cached value
await cacheDelete(redis, "user:123");

// Delete all cached values matching pattern
await cacheDeletePattern(redis, "user:*");
```

### Rate Limiting

```typescript
import {
  createRedis,
  checkRateLimit,
  checkMultiRateLimit,
} from "@damatjs/utils";

const redis = createRedis({ url: "redis://localhost:6379" });

// Simple rate limit: 100 requests per minute
const result = await checkRateLimit(redis, `user:${userId}`, 60000, 100);

if (!result.allowed) {
  throw new Error(`Rate limited. Retry after ${result.retryAfter} seconds`);
}

// Multi-window rate limit
const multiResult = await checkMultiRateLimit(redis, `user:${userId}`, [
  { windowMs: 60000, maxRequests: 60 }, // 60 per minute
  { windowMs: 3600000, maxRequests: 1000 }, // 1000 per hour
  { windowMs: 86400000, maxRequests: 10000 }, // 10000 per day
]);

if (!multiResult.allowed) {
  console.log(`Limited by ${multiResult.limitedBy} window`);
}
```

### Session Storage

```typescript
import {
  createRedis,
  getSession,
  setSession,
  deleteSession,
  extendSession,
} from "@damatjs/utils";

const redis = createRedis({ url: "redis://localhost:6379" });

interface SessionData {
  userId: string;
  role: string;
}

// Create session (24 hour TTL)
await setSession(redis, sessionToken, { userId: "123", role: "admin" }, 86400);

// Get session
const session = await getSession<SessionData>(redis, sessionToken);

// Extend session TTL
const extended = await extendSession(redis, sessionToken, 86400);

// Delete session (logout)
await deleteSession(redis, sessionToken);
```

### Distributed Locks

```typescript
import {
  createRedis,
  acquireLock,
  releaseLock,
  withLock,
} from "@damatjs/utils";

const redis = createRedis({ url: "redis://localhost:6379" });

// Manual lock management
const lockValue = await acquireLock(redis, "process-order:123", 30000);
if (!lockValue) {
  throw new Error("Could not acquire lock");
}
try {
  await processOrder(123);
} finally {
  await releaseLock(redis, "process-order:123", lockValue);
}

// Using withLock helper (recommended)
const result = await withLock(
  redis,
  "process-order:123",
  async () => {
    return await processOrder(123);
  },
  30000,
);
```

### Atomic Counters

```typescript
import {
  createRedis,
  incrementCounter,
  decrementCounter,
  getCounter,
} from "@damatjs/utils";

const redis = createRedis({ url: "redis://localhost:6379" });

// Increment counter
const newValue = await incrementCounter(redis, "pageviews:home", 1);

// Increment with TTL (expires at midnight)
await incrementCounter(redis, `daily:${today}`, 1, 86400);

// Decrement counter
await decrementCounter(redis, "stock:item:123", 1);

// Get current value
const count = await getCounter(redis, "pageviews:home");
```

## Configuration

### RedisConfig

| Property               | Type                    | Required | Default | Description                     |
| ---------------------- | ----------------------- | -------- | ------- | ------------------------------- |
| `url`                  | `string`                | Yes      | -       | Redis connection URL            |
| `maxRetriesPerRequest` | `number`                | No       | `3`     | Max retries per request         |
| `lazyConnect`          | `boolean`               | No       | `true`  | Connect lazily on first command |
| `options`              | `Partial<RedisOptions>` | No       | -       | Additional ioredis options      |

## Migration from Old API

The old singleton-based API is deprecated but still available:

```typescript
// Old way (deprecated)
import { getRedis } from "@damatjs/utils";
const redis = getRedis(); // Throws if not initialized

// New way (recommended)
import { createRedis } from "@damatjs/utils";
const redis = createRedis({ url: process.env.REDIS_URL });
```

If you must use the singleton pattern:

```typescript
import { initRedis, getRedis, disconnectRedis } from "@damatjs/utils";

// Initialize once at startup
initRedis({ url: process.env.REDIS_URL });

// Use anywhere
const redis = getRedis();

// Cleanup at shutdown
await disconnectRedis();
```

## Key Prefixes

Each utility uses a prefix to avoid key collisions:

| Utility    | Prefix       |
| ---------- | ------------ |
| Cache      | `cache:`     |
| Rate Limit | `ratelimit:` |
| Session    | `session:`   |
| Lock       | `lock:`      |
| Counter    | (none)       |
