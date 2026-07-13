---
"@damatjs/events": minor
"@damatjs/jobs": minor
"@damatjs/redis": patch
"@damatjs/services": minor
"@damatjs/framework": minor
---

Subscription/event system and background job & queue system:

- **@damatjs/events** (new package): a typed event bus — `getEventBus().on/once/off/emit`, declaration-merged `EventMap` for full payload typing, `"*"` wildcard subscribers, async handlers awaited with error isolation (a failing subscriber is logged, never breaks the others or the emitter). Cross-process delivery is opt-in via Redis pub/sub (`connectEventBroadcast()`): local delivery unchanged, remote events arrive with `context.source === "remote"`, self-messages deduped, dedicated subscriber connection closed on shutdown.
- **@damatjs/jobs** (new package): background jobs on `RedisQueue` — `defineJob(name, handler, { maxAttempts, backoffMs, backoffMultiplier, priority })`, `enqueueJob(name, payload, { priority, delayMs, maxAttempts })` from any process, and `JobWorker` (`concurrency`, polling, graceful `stop()` that drains in-flight jobs). Failures retry with exponential backoff then dead-letter with the error preserved; unknown job names dead-letter immediately with a clear message; crashed workers' jobs redeliver via the queue's visibility timeout (handlers should be idempotent). Declaration-merged `JobMap` types payloads.
- **@damatjs/redis**: `RedisQueue.updateStatus` re-queues (`retrying`/`pending`) now honor the job's `delay` and priority like `enqueue` does — retry backoff actually defers redelivery.
- **@damatjs/services**: opt-in `events: true` on the service config emits `<model>.created|updated|deleted` (payload `{ model, method, result }`) on the global bus after every successful write — layered with the existing cache/logging proxies (cache innermost, events, logging outermost).
- **@damatjs/framework**: re-exports both packages and wires them via `services.events.broadcast` (+ optional `channel`) and `services.jobs.worker` (+ `queueName`/`concurrency`/`pollIntervalMs`) — the worker starts after module init so installed modules' `defineJob`s are registered, and both get graceful shutdown handlers. Both warn clearly when requested without `redisUrl`.
