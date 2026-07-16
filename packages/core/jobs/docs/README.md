# @damatjs/jobs — Internals

Maintainer-facing documentation. For usage see the [package README](../README.md).

This package currently exposes the Redis-backed producer and worker while also
owning the internal PostgreSQL persistence foundation used by the durable
worker. The package root remains the compatibility surface. Only the migration
catalog is exported as a subpath so `@damatjs/orm-cli` can apply it.

## Module map

| Area                | Responsibility                                                  |
| ------------------- | --------------------------------------------------------------- |
| Root source files   | Current Redis-backed public API and worker.                     |
| `src/definitions/`  | Internal durable definition defaults and process-wide registry. |
| `src/migrations/`   | Ordered PostgreSQL jobs system-migration catalog.               |
| `src/repositories/` | SQL rows, normalized domain mappers, and storage operations.    |
| `src/client/`       | Internal enqueue, inspection, cancellation, and retry clients.  |
| `tests/storage/`    | PostgreSQL schema, enqueue, deduplication, and read tests.      |

## PostgreSQL storage foundation

The jobs catalog follows the shared durability catalog and creates:

- `_damat_job_runs`, attempts, immutable activity, and bounded log storage;
- schedules plus immutable schedule activity;
- queue/name/key deduplication records with optional expiration.

Run payloads, metadata, progress, result summaries, errors, actors, and log
context use native `JSONB`. All lifecycle timestamps use `TIMESTAMPTZ`.
Priority is numeric and lower values sort first. The due-work index orders by
queue, status, availability, priority, and creation time.

Enqueue is one transaction: an optional deduplication claim, the run insert,
and the immutable `enqueued` activity row either all commit or all roll back.
A supplied executor must be an active Damat transaction wrapper. Without one,
the configured durability client opens the transaction. Active deduplication
keys return the existing normalized run; expired keys atomically take ownership
of a new run.

Repository mutations return mapped domain records rather than PostgreSQL row
shapes. Activity timelines order by their identity column, preserving committed
write order even when transaction timestamps overlap or move backward.

The internal client is intentionally not re-exported from `src/index.ts`.
Changing the package root and worker together is a separate atomic cutover.

## Architecture overview

```
  defineJob("send-email", handler, opts)      enqueueJob("send-email", payload, opts)
        │                                            │  QueueJob{ data: {job, payload} }
        ▼                                            ▼
  registry (globalThis Map) ◄─── lookup ───  getJobQueue() ── RedisQueue "damat-jobs"
        ▲                                            ▲   (sorted set, score = due time)
        │ getJobDefinition(job.data.job)             │
        └──────────── JobWorker.tick() ── dequeue(capacity) ── process(job)
                            │                                     ├─ ok → completed
                            └ setTimeout(next tick)               ├─ fail < max → retrying + delay
                                                                  └─ fail ≥ max → failed (dead-letter)
```

### One shared queue, `{job, payload}` envelope

Every job rides a single `RedisQueue` named `"damat-jobs"` (`DEFAULT_JOB_QUEUE`) unless
`queueName` is overridden. The queue payload is a `JobEnvelope` — `{ job: name, payload }`
— so the worker can route each dequeued item to its handler by name. Trade-off vs a
queue-per-job design: one worker drains everything and priorities interleave globally
across job types, at the cost of not being able to scale or pause one job type
independently. When that matters, `queueName` (on `defineJob`'s consumers: `enqueueJob`
and `JobWorker`) gives you a second queue with its own worker — the registry is shared
either way.

`getJobQueue()` caches one `RedisQueue` instance per queue name on `globalThis`
(`Symbol.for("damatjs.jobs.queues")`), shared by enqueuers and workers in the process.
Default `visibilityTimeoutMs` here is 30s (passed to `RedisQueue`).

### The `globalThis` registry (`registry.ts`)

Definitions live in a `Map` on `globalThis` under `Symbol.for("damatjs.jobs.registry")`
— same pattern (and same rationale) as the event bus and `PoolManager`: a linked dev
copy of the package next to an installed copy must still see one registry, because a
worker can only execute jobs whose definitions it can look up. **Definitions are code,
not data**: the worker process must _import_ the modules that call `defineJob` — the
framework's module init does this for installed modules, which is why the framework
starts the worker _after_ module init. `defineJob` throws on duplicate names.

### Enqueue resolution order (`enqueue.ts`)

`enqueueJob(name, payload, options)` builds a `QueueJob<JobEnvelope>` with a random UUID
id and resolves each knob as **call option → definition option → package default**:

- `priority`: `options.priority ?? definition?.options.priority ?? "normal"`
- `maxAttempts`: `options.maxAttempts ?? definition?.options.maxAttempts ?? 3`
- `delay`: only set when `options.delayMs` is given.

The definition is looked up but **not required** — an API process may enqueue a job that
only the worker process defines; it then simply gets package defaults for anything not
passed explicitly.

### Worker loop (`worker.ts`)

`start()` is idempotent and returns immediately; the loop is an async `tick()` chain:

1. Compute free capacity (`concurrency - inFlight.size`, default concurrency 1).
2. `dequeue(capacity)` from the queue; each job's `process()` promise is tracked in the
   `inFlight` set (self-removing via `.finally`). A dequeue error is logged and retried
   next poll.
3. Schedule the next tick: **immediately (delay 0) when the batch came back full**
   (`dequeued === capacity && dequeued > 0` — there is likely more waiting), otherwise
   after `pollIntervalMs` (default 1000).

`stop()` flips `running`, clears the pending timer, then `await Promise.allSettled(inFlight)`
— it drains in-flight jobs rather than abandoning them. Delayed/backoff jobs are
invisible to `dequeue` until their score is due; jobs claimed by a crashed worker are
redelivered by the queue's visibility timeout.

### Retry math and dead-lettering (`process()`)

`process()` never throws. On handler failure at attempt `n` (= `job.attempts + 1`):

- if `n >= maxAttempts` (job's own value, else the definition's): `updateStatus` to
  `"failed"` with the error and `completedAt` — the queue's `failed` set is the
  dead-letter store.
- else: `updateStatus` to `"retrying"` with
  `delay = backoffMs * backoffMultiplier^(n-1)` (defaults 1000ms × 2^… → 1s, 2s, 4s…).
  The delay **rides the queue score**: `RedisQueue.updateStatus` re-queues
  `retrying`/`pending` jobs with `score = Date.now() + delay - priorityBoost`, so this
  only works because `@damatjs/redis`'s `updateStatus` honors `job.delay` on re-queue —
  don't "simplify" that away.

**Unknown job names** (no `defineJob` in this process) dead-letter immediately with a
descriptive error — the fix is deploying the defining code, not retrying.

## Invariants & design decisions

- **At-least-once delivery.** Visibility-timeout redelivery means a job that a worker
  claimed but didn't complete (crash, stall past 30s) runs again — handlers must be
  idempotent. There is deliberately no exactly-once machinery.
- **Producer and consumer are decoupled** through the envelope + registry: enqueuers
  don't need definitions; workers don't need the enqueuing code.
- **All shared state is on `globalThis`** (registry, queue cache) under `Symbol.for`
  keys, for the duplicate-package-copy reason above.
- **The worker owns no queue mechanics.** Scoring, priority, delay, visibility timeout,
  and the pending/processing/completed/failed sets all live in
  [`RedisQueue`](../../redis/docs/queue.md); this package only decides _status
  transitions_ via `updateStatus`.

## Safe extension (quick reference)

**Add a job option:** extend `JobOptions` + `DEFAULT_JOB_OPTIONS` in `types.ts`, thread
it through `defineJob`'s merge, and honor it in `enqueueJob` and/or `JobWorker.process`
(keep the option > definition > default order).

**Gotchas:**

- A handler that outlives the visibility timeout (default 30s) gets redelivered while
  still running — raise `visibilityTimeoutMs` (on both enqueuer and worker options if
  they construct the queue independently, since the first `getJobQueue()` call for a
  name wins and caches).
- `enqueueJob`'s returned `QueueJob` is the _submitted_ snapshot; later status changes
  live in Redis (`getJobQueue().getJob(id)`).
- `worker.process()` reads `backoffMs`/`backoffMultiplier` from the **definition** only —
  there is no per-enqueue backoff override (unlike `maxAttempts`/`priority`).
- `clearJobDefinitions()`/`clearJobQueues()` are test helpers; clearing definitions under
  a live worker turns every in-flight retry into an unknown-job dead-letter.

## Tests

`tests/registry.test.ts` is a pure unit test. `tests/enqueue.test.ts` and
`tests/worker.test.ts` are integration tests needing a reachable Redis (`REDIS_URL` or
`localhost:6379`), like the `@damatjs/redis` suites. `tests/storage/` needs a
disposable PostgreSQL database through `DATABASE_URL`.

## Related docs

- [Package README](../README.md)
- [@damatjs/redis queue internals](../../redis/docs/queue.md) — scoring, visibility timeout, status sets.
- [@damatjs/events internals](../../events/docs/README.md) — fire-and-forget counterpart to durable jobs.
