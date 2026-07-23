# @damatjs/jobs

Durable PostgreSQL background jobs for Damat applications.

Jobs persist their run, retry policy, attempts, progress, structured logs,
activity, cancellation, result, and errors. Workers use fenced leases and
`FOR UPDATE SKIP LOCKED`, so several processes can safely poll the same queue.

## Install and migrate

```bash
bun add @damatjs/jobs
damat-orm migrate:up
```

Framework applications configure `projectConfig.databaseUrl` and
`services.jobs`. Redis is not required. Optional Redis wake-ups reduce polling
latency without becoming the source of truth.

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
durability client. PostgreSQL calculates relative enqueue delays from its own
clock, so immediate jobs remain claimable when an application host's wall clock
differs slightly from the database.

## Schedule jobs

```ts
import { createJobSchedule, listJobSchedules } from "@damatjs/jobs";

await createJobSchedule({
  name: "daily-cleanup",
  jobName: "cleanup",
  payload: {},
  schedule: { kind: "interval", everyMs: 86_400_000 },
});

const schedules = await listJobSchedules({ enabled: true });
```

One-time and fixed-interval schedules are supported. Cron is rejected. Each
occurrence and the schedule's next occurrence advance in one transaction.
Unique schedule/time identities make overlapping reconcilers idempotent.
Optional schedule deduplication suppresses runs until its TTL expires.

## Run a worker

```ts
import { JobWorker } from "@damatjs/jobs";

const worker = new JobWorker({
  queue: "mail",
  concurrency: 4,
  pollIntervalMs: 5_000,
  registryHeartbeatIntervalMs: 30_000,
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
  jobs: { queue: "mail", concurrency: 4 },
},
runtime: {
  mode: "worker", // or "all" to serve HTTP too
  workers: ["jobs"],
},
```

The framework defaults to `runtime.mode: "all"` and selects enabled durable
capabilities, so the `runtime` block can be omitted when one process serves HTTP
and jobs. A dedicated worker deployment can instead set
`DAMAT_RUNTIME_MODE=worker` and `DAMAT_WORKER_TYPES=jobs` without changing the
application build.

The worker starts after modules register their definitions and after PostgreSQL
migration readiness succeeds. Calling `start()`
again while that worker is running is idempotent. A worker instance is one-shot:
after stop begins, another `start()` throws synchronously; construct a new
worker to run again. `stop()` stops new claims, marks the worker as stopping,
waits up to the grace period, then aborts unfinished handler signals and stops
renewing their leases. Shutdown and terminal transitions wait for an in-flight
renewal to settle, so no heartbeat can extend a lease after either boundary
returns. The registry remains `stopping` while handler code is
still running and changes to `stopped` only after it settles and PostgreSQL
persists that transition. Persistence failures reject `stop()` and a later
`stop()` retries them. Registry heartbeats and reconciliation remain active
through the graceful drain phase, then quiesce before the worker persists its
final `stopped` transition.

The worker also owns bounded lease, retry, schedule, idempotency, and retention
reconciliation. Expired leases, not worker-registry state, decide recovery.
Recovery activity retains the expired worker and lease token. An immediately
reclaimed run records that recovery to `queued`, then records a separate claim
for the new worker and token.
Framework-managed workers use Redis wake-ups while healthy and perform a
PostgreSQL safety scan every 30 seconds. If Redis is missing or unauthorized,
the shared coordinator falls back to PostgreSQL discovery within five seconds.
Standalone workers default to five-second PostgreSQL polling.

Configure enqueue-side wake-ups with `configureJobWakeupPublisher(redis)` and
pass a Redis-compatible client as `wakeupRedis` to a worker. The worker uses a
dedicated duplicated subscriber. Missing Redis, malformed messages, and
publish failures only reduce responsiveness to the polling interval. Subscriber
connection errors are handled through structured warnings rather than escaping
as raw unhandled Redis events. Mutations inside a caller-owned transaction do
not publish directly. They still write a
transactional acceleration-outbox row; the framework relay publishes it only
after the outer transaction commits.

Worker options are validated when the worker is constructed. Queue and supplied
worker IDs must be non-empty, concurrency and log limits must be positive
integers, timing values must be finite and positive, and the progress interval
may also be zero. The job heartbeat must be shorter than its lease. Registry
heartbeats default to durable snapshots every 30 seconds and are capped at 120
seconds. Framework Redis liveness expires after 10 seconds; inspection treats
PostgreSQL snapshots as stale after 90 seconds by default. Concurrency is capped
at PostgreSQL's signed 32-bit maximum;
timers are capped at 2,147,483,647 ms; log limits must be safe integers.
`stop({ graceMs })` applies the same timer ceiling and accepts zero for an
immediate abort.

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

Pipeline-created jobs carry internal `_damatPipeline` ownership metadata. Their
fenced terminal transaction writes a pipeline acceleration-outbox signal in the
same commit, so the graph router cannot observe a completion that PostgreSQL did
not commit. Ordinary job retention excludes these runs: pipeline retention
deletes the owning node records, complete child tree, and backing jobs together.
The framework integration hook lives at `@damatjs/jobs/pipeline-integration`;
applications should use pipeline clients rather than replacing that hook.

The package exposes a typed headless client rather than unauthenticated routes:

```ts
import { createJobInspectionClient } from "@damatjs/jobs";

const jobs = createJobInspectionClient({
  cursorSigningKey: process.env.INSPECTION_CURSOR_KEY!,
  visibility: "metadata",
  redaction: { keys: ["token", "password"] },
});

const page = await jobs.listRuns({
  views: ["processing", "failed"],
  limit: 50,
});
const detail = await jobs.getRun(page.items[0]!.id);
```

Lists use signed timestamp-and-UUID cursors. Native statuses remain unchanged;
`upcoming`, `processing`, `retrying`, `failed`, and `completed` are derived
views, while recovery is an independent flag. Detail reads use one
repeatable-read snapshot and include attempts, activity, logs, leases, workers,
queue controls, and schedule history. Visibility defaults to `metadata`;
payload and result access requires `full`. Queue-control history returns at most
500 entries and sets `controlHistoryTruncated` when more records exist.

Operational summaries measure queue wait from `availableAt`, so intentional
schedule delay is excluded, and attribute the sample to its half-open
attempt-start window. Every immutable attempt captures `availableAt` and
`waitMs` atomically from the run's current availability, preserving retry
waits. Legacy attempts keep unknown timing omitted and are excluded from
distributions rather than treated as zero. Capacity includes active workers
only; active and stale counts plus heartbeat diagnostics exclude stopping and
stopped workers.
Active and stale per-worker records expose capabilities, state, concurrency,
in-flight load, and heartbeat age; stopped and stopping history is excluded.
Application and deployment metadata follow inspection visibility and redaction.
Throughput rows are grouped by bucket, queue, and job name.
Configured redaction also applies to grouped failure messages.

Bounded summaries expose current status, wait, lease, worker, and dead-letter
state plus half-open time-window throughput, activity, and duration metrics.
Administrative cancellation, retry, queue pause/resume, schedule enable/disable,
and retention require a validated actor and append immutable audit history.
Applications decide how to authenticate and present these records.

Retention defaults to 90 days and accepts `"forever"`. PostgreSQL keeps the
complete inspection timeline; Redis stores only rebuildable ready identifiers,
worker liveness, and invalidation signals.

## Public definition API

`JobMap`, `defineJob`, `getJobDefinition`, `getAllJobDefinitions`, and
`clearJobDefinitions` use one process-wide registry. Raw Redis queue access is
not part of the jobs API.

## License

MIT
