[Damat Guide](../GUIDE.md) › Redis

# 10. Redis: cache, queue, locks, rate limiting

[`@damatjs/redis`](../../packages/core/redis/README.md) provides batteries-included
Redis helpers. Initialize the client once (the framework does this for you when
`projectConfig.redisUrl` is set), then use the helpers anywhere.

```ts
import { initRedis } from "@damatjs/redis";

initRedis(process.env.REDIS_URL!); // only needed outside a framework app
```

## Cache

```ts
import { cacheGet, cacheSet } from "@damatjs/redis";

await cacheSet("user:1", user, 60); // (key, value, ttlSeconds — default 300)
const cached = await cacheGet<User>("user:1"); // typed read; null on miss
```

Values are JSON-serialized for you. For group invalidation, `cacheSetTagged(key,
value, ttl, tags)` indexes an entry under invalidation tags and
`invalidateCacheTags(tags)` drops every entry in a tag at once — the model the
service layer's opt-in read cache is built on (see
[Querying & CRUD → read caching](./07b-crud-reference.md#opt-in-read-caching-events--query-logging)).

## Rate limiting

```ts
import { checkRateLimit } from "@damatjs/redis";

const result = await checkRateLimit("ip:1.2.3.4", 60_000, 100);
// (identifier, windowMs, maxRequests)
if (!result.allowed) {
  // result: { allowed, remaining, resetAt, retryAfter? }
}
```

The HTTP layer can also rate-limit for you — see `http.rateLimit` in
[Configuration](./04-configuration.md).

## Distributed locks

```ts
import { withLock, acquireLock, releaseLock } from "@damatjs/redis";

// run a critical section under a lock (ttlMs default 10_000)
await withLock(
  "import-job",
  async () => {
    /* only one process runs this at a time */
  },
  30_000,
);

// or manage the lock yourself
const token = await acquireLock("import-job", 30_000); // null if already held
if (token) {
  try {
    /* ... */
  } finally {
    await releaseLock("import-job", token);
  }
}
```

Locks are value-checked: `releaseLock` only releases if you still hold it.
Workflows build on the same primitive via
[`executeWithLock`](./09-workflows.md).

## Job queue

`RedisQueue` is a low-level Redis queue with status tracking and retry
accounting. Durable application jobs use the separate PostgreSQL-backed
[`@damatjs/jobs`](./10b-events-and-jobs.md#background-jobs) layer. Reach for
`RedisQueue` directly only for explicitly ephemeral Redis queue use cases:

```ts
import { RedisQueue, type QueueJob } from "@damatjs/redis";

const queue = new RedisQueue<{ to: string }>("emails");

const job: QueueJob<{ to: string }> = {
  id: crypto.randomUUID(),
  queue: "emails",
  data: { to: "a@b.co" },
  status: "pending",
  priority: "normal", // "low" | "normal" | "high" | "critical"
  attempts: 0,
  maxAttempts: 3,
  createdAt: new Date(),
};
await queue.enqueue(job);

// in a worker:
const jobs = await queue.dequeue(10);
// plus: getJob(id), updateStatus(job), cancelJob(id), getStats(), clear()
```

## Sessions and counters

- `SessionManager<T>` — token → session data with TTL and optional
  extend-on-access (`get`, `set`, `delete`, `touch`, `refresh`).
- Counters — `incrementCounter(key, amount?, ttlSeconds?)`, `getCounter(key)`,
  plus decrement/reset/set.

See the [redis internals](../../packages/core/redis/docs/README.md) for every
helper and its options.

---

Prev: [← Workflows](./09-workflows.md) · [Guide home](../GUIDE.md) · Next: [Logging →](./11-logging.md)
