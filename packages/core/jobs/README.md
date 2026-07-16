# @damatjs/jobs

Durable PostgreSQL background jobs for Damat applications.

Jobs persist their run, retry policy, attempts, progress, structured logs,
activity, cancellation, result, and errors. Workers use fenced leases and
`FOR UPDATE SKIP LOCKED`, so several processes can safely poll the same queue.

## Install and migrate

```bash
bun add @damatjs/jobs
bun run db:migrate
```

Framework applications configure `projectConfig.databaseUrl` and
`services.jobs`. Redis is not required; a later optional wake-up transport can
reduce polling latency without becoming the source of truth.

## Define and enqueue

```ts
import { defineJob, enqueueJob } from "@damatjs/jobs";

declare module "@damatjs/jobs" {
  interface JobMap {
    "send-welcome": { userId: string };
  }
}

defineJob(
  "send-welcome",
  async ({ userId }, context) => {
    await context.progress(25, { phase: "render" });
    await context.log("info", "Sending welcome", { userId });
    await mailer.sendWelcome(userId);
    return { sent: true };
  },
  { queue: "mail", maxAttempts: 5, backoffMs: 2_000 },
);

const run = await enqueueJob(
  "send-welcome",
  { userId: "u1" },
  {
    priority: 10,
    metadata: { source: "signup" },
  },
);
```

`enqueueJob` may receive an active durability transaction executor so the
domain write and enqueue commit together. Without one it uses the configured
durability client.

## Run a worker

```ts
import { JobWorker } from "@damatjs/jobs";

const worker = new JobWorker({
  queue: "mail",
  concurrency: 4,
  pollIntervalMs: 1_000,
  registryHeartbeatIntervalMs: 5_000,
});

worker.start();
await worker.stop({ graceMs: 30_000 });
```

Framework apps normally use:

```ts
projectConfig: {
  databaseUrl: process.env.DATABASE_URL,
},
services: {
  jobs: { worker: true, queue: "mail", concurrency: 4 },
},
```

The worker starts after modules register their definitions. Calling `start()`
again while that worker is running is idempotent. A worker instance is one-shot:
after stop begins, another `start()` throws synchronously; construct a new
worker to run again. `stop()` stops new claims, marks the worker as stopping,
waits up to the grace period, then aborts unfinished handler signals and stops
renewing their leases. The registry remains `stopping` while handler code is
still running and changes to `stopped` only after it settles and PostgreSQL
persists that transition. Persistence failures reject `stop()` and a later
`stop()` retries them.

Worker options are validated when the worker is constructed. Queue and supplied
worker IDs must be non-empty, concurrency and log limits must be positive
integers, timing values must be finite and positive, and the progress interval
may also be zero. The job heartbeat must be shorter than its lease. Registry
heartbeats are capped at 25 seconds, below the durability registry's 30-second
stale window.

## Delivery semantics

- Delivery is at least once; handlers should make side effects idempotent.
- Claims, attempts, and activity are created in one transaction.
- Every heartbeat and terminal transition matches run, worker, lease token,
  and lease expiry. A stale worker cannot finish reclaimed work.
- Failures use persisted exponential backoff and become dead letters after the
  final attempt. An invalid or overflowing retry date dead-letters rather than
  retaining a stuck lease. Unknown definitions dead-letter immediately.
- Queued work cancels immediately. Running cancellation reaches the handler
  through `context.signal`; completion also rechecks the request atomically.
- Handler results must be JSON-safe. Invalid results fail visibly through the
  normal retry/dead-letter path.
- Terminal activity includes the latest persisted progress snapshot. Structured
  log byte limits use the same PostgreSQL `jsonb` representation that is stored.

## Inspection and administration

The package exposes headless clients rather than unauthenticated routes:

- `getJobRun`, `listJobRuns`, `listJobAttempts`;
- `listJobActivity`, `listJobLogs`;
- `cancelJobRun`, `retryJobRun`.

Applications decide how to authenticate and present these records.

## Public definition API

`JobMap`, `defineJob`, `getJobDefinition`, `getAllJobDefinitions`, and
`clearJobDefinitions` use one process-wide registry. Raw Redis queue access is
not part of the jobs API.

## License

MIT
