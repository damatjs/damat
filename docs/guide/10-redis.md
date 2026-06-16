[Damat Guide](../GUIDE.md) › Redis

# 10. Redis: cache, queue, locks, rate limiting

[`@damatjs/redis`](../../packages/core/redis/README.md) provides batteries-included
Redis helpers. Initialize the client once (the framework does this when
`redisUrl` is set), then use the helpers.

```ts
import {
  initRedis, cacheGet, cacheSet,
  checkRateLimit, withLock, RedisQueue,
} from "@damatjs/redis";

initRedis(process.env.REDIS_URL!);

// cache with TTL
await cacheSet("user:1", user, 60);
const cached = await cacheGet("user:1");

// sliding-window rate limit
const { allowed } = await checkRateLimit("ip:1.2.3.4", { limit: 100, windowMs: 60_000 });

// distributed lock
await withLock("import-job", { ttlMs: 30_000 }, async () => { /* critical section */ });

// background queue
const queue = new RedisQueue("emails");
await queue.enqueue({ to: "a@b.co" });
```

It also covers sessions and counters. See the
[redis internals](../../packages/core/redis/docs/README.md) for every helper and
its options.

---

Prev: [← Workflows](./09-workflows.md) · [Guide home](../GUIDE.md) · Next: [Logging →](./11-logging.md)
