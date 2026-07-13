# @damatjs/jobs

> Background job & worker layer for Damat apps, on the Redis-backed queue.

Define jobs as code, enqueue them from anywhere (with priority and delay), and
run them in worker processes with retries, exponential backoff, dead-lettering,
and crash redelivery — all on `@damatjs/redis`'s `RedisQueue`.

Part of the [Damat](../../../README.md) monorepo.

## Install

```bash
bun add @damatjs/jobs   # re-exported by @damatjs/framework
```

## Quick start

```ts
import { defineJob, enqueueJob, JobWorker } from "@damatjs/jobs";

// Type your jobs once (declaration merging):
declare module "@damatjs/jobs" {
  interface JobMap {
    "send-welcome-email": { userId: string };
  }
}

// 1. Define (in the code the worker process imports):
defineJob("send-welcome-email", async ({ userId }) => {
  await mailer.sendWelcome(userId);
}, { maxAttempts: 5, backoffMs: 2000 });

// 2. Enqueue (from any process — API, workflow step, cron):
await enqueueJob("send-welcome-email", { userId: "u1" });
await enqueueJob("send-welcome-email", { userId: "u2" }, {
  priority: "high",
  delayMs: 60_000,          // deliver in a minute
});

// 3. Work (framework apps set services.jobs.worker instead):
const worker = new JobWorker({ concurrency: 4 });
worker.start();
// … await worker.stop() on shutdown (waits for in-flight jobs)
```

## Semantics

- **Retries**: a failing job re-queues with exponential backoff
  (`backoffMs * multiplier^(attempt-1)`) until `maxAttempts`, then
  dead-letters into the queue's `failed` set with the error preserved.
- **Delayed jobs** ride the queue's score — the worker simply doesn't see
  them until they're due.
- **Crash safety**: the queue's visibility timeout (default 30s here)
  redelivers jobs a dead worker claimed — handlers should be idempotent
  (at-least-once delivery).
- **Unknown jobs** (no `defineJob` in the worker process) dead-letter
  immediately with a clear error — deploy the defining code, don't guess.
- **Inspection**: `getJobQueue().getStats()` / `.getJob(id)` / `.cancelJob(id)`
  are the raw `RedisQueue` surface underneath.

In framework apps:

```ts
// damat.config.ts — the worker starts after module init (so every module's
// defineJob is registered) and stops gracefully on shutdown.
services: { jobs: { worker: true, concurrency: 4 } }
```

## API

| Export | Kind | Summary |
| --- | --- | --- |
| `defineJob(name, handler, options?)` | function | Register a job (unique name). Options: `maxAttempts` (3), `backoffMs` (1000), `backoffMultiplier` (2), `priority` ("normal"). |
| `enqueueJob(name, payload, options?)` | function | Queue a run: `priority`, `delayMs`, `maxAttempts`, `queueName`, `client`. Returns the queued job. |
| `JobWorker` | class | `start()`, `stop()` (graceful), `isRunning`, `process(job)`. Options: `concurrency`, `pollIntervalMs`, `queueName`, `visibilityTimeoutMs`, `client`. |
| `getJobQueue(options?)` / `clearJobQueues()` | function | The shared per-name `RedisQueue` instances. |
| `getJobDefinition` / `getAllJobDefinitions` / `clearJobDefinitions` | function | Registry access (state on `globalThis`). |
| `JobMap` | interface | Augment to type job payloads. |
| `JobHandler`, `JobOptions`, `JobDefinition`, `JobEnvelope`, `DEFAULT_JOB_QUEUE`, `DEFAULT_JOB_OPTIONS` | types/consts | Shapes and defaults. |

## How it fits

**Depends on**: `@damatjs/redis` (`RedisQueue`), `@damatjs/logger`. **Used
by**: `@damatjs/framework` (worker lifecycle + re-export). Multi-step
processes with compensation belong in `@damatjs/workflow-engine`; a job
handler is a fine place to `execute()` a workflow.

## License

MIT
