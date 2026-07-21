# Job queue — `RedisQueue`

Covers `src/queue/` (`types.ts`, `constant.ts`, `scripts.ts`, `queue.ts`).

## Responsibility

A Redis-backed **priority + delay** job queue. It provides storage and state-transition primitives (enqueue, dequeue a batch, update status, query, cancel, stats, clear) plus an optional **visibility timeout** that redelivers jobs whose worker crashed. It is **not** a worker runtime — there is no polling loop, retry scheduler, or backoff. Callers (or a higher layer) own the consume loop and retry policy.

## Types — `src/queue/types.ts`

```ts
interface QueueJob<TData = unknown> {
  id: string;
  queue: string;
  data: TData;
  status: "pending" | "processing" | "completed" | "failed" | "retrying";
  priority: "low" | "normal" | "high" | "critical";
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  delay?: number; // ms to defer before the job becomes due
  metadata?: Record<string, unknown>;
}

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

interface RedisQueueOptions {
  visibilityTimeoutMs?: number; // > 0 enables reclaim of stale :processing entries on dequeue
  maxCompletedEntries?: number; // cap on the :completed zset (default 10000; <= 0 disables trimming)
  maxFailedEntries?: number; // cap on the :failed zset (default 10000; <= 0 disables trimming)
}
```

`PRIORITY_SCORES` (`constant.ts`): `{ critical: 4, high: 3, normal: 2, low: 1 }`.

## Redis layout

For a queue named `<name>`, `keyPrefix = "queue:<name>"` and five keys are used:

| Key                       | Type | Holds                                           |
| ------------------------- | ---- | ----------------------------------------------- |
| `queue:<name>:jobs`       | hash | `jobId → JSON(job)` (the full record)           |
| `queue:<name>:pending`    | zset | jobs waiting, scored by due-time-minus-priority |
| `queue:<name>:processing` | zset | jobs handed out, scored by dequeue time         |
| `queue:<name>:completed`  | zset | finished jobs, scored by completion time        |
| `queue:<name>:failed`     | zset | failed jobs, scored by completion time          |

## Class API — `src/queue/queue.ts`

```ts
class RedisQueue<TData = unknown> {
  constructor(queueName: string, redis?: Redis, options?: RedisQueueOptions); // redis ?? getRedis()
  enqueue(job: QueueJob<TData>): Promise<void>;
  dequeue(count: number): Promise<QueueJob<TData>[]>;
  updateStatus(job: QueueJob<TData>): Promise<void>;
  getJob(jobId: string): Promise<QueueJob<TData> | null>;
  cancelJob(jobId: string): Promise<boolean>;
  getStats(): Promise<QueueStats>;
  clear(): Promise<void>;
}
```

### `enqueue`

```ts
const priorityScore = PRIORITY_SCORES[job.priority] ?? 2; // normal if unknown
const score = Date.now() + (job.delay ?? 0) - priorityScore * 1000;
// pipeline: HSET jobs id JSON(job) ; ZADD pending score id
```

The **score encodes due time and priority**: lower score = dequeued earlier. `delay` pushes the score into the future; higher priority subtracts up to `4000` ms, so a `critical` job effectively jumps ahead of `normal` jobs queued within ~3 s of it. The full job is stored in the `jobs` hash.

### `dequeue(count)`

The claim runs as a **single Lua script** (`DEQUEUE_SCRIPT` in `scripts.ts`), so concurrent workers can never claim the same job — the read and the move happen atomically server-side:

1. _(only when `visibilityTimeoutMs` is set)_ `ZRANGEBYSCORE processing 0 (now − visibilityTimeoutMs)` — entries claimed longer ago than the timeout are moved back to `pending` with score `now` (immediately due, priority/delay not re-applied), so jobs from crashed workers are redelivered.
2. `ZRANGEBYSCORE pending 0 now LIMIT 0 count` — pull up to `count` job ids whose score is **due** (`<= now`). Delayed jobs (future score) are skipped until due.
3. Per claimed id: `ZREM pending id` + `ZADD processing now id` — the score records the **claim timestamp** used by step 1.
4. Back in JS: if no ids, return `[]`; else `HMGET jobs ...ids`, filter out `null`s, `JSON.parse` each → `QueueJob[]`.

`dequeue` returns the job **records** but does **not** mutate `status`/`startedAt`/`attempts` on them — the caller updates those fields and calls `updateStatus`. **`updateStatus` is the ack**: it removes the job from `processing`; with a visibility timeout enabled, workers must ack before the timeout elapses or the job is redelivered (at-least-once delivery).

### `updateStatus(job)`

Routes the job to a terminal/return set based on `job.status`:

```ts
const statusSet =
  job.status === "completed"
    ? "completed"
    : job.status === "failed"
      ? "failed"
      : "pending"; // anything else (incl. "retrying"/"processing") → back to pending
// score: pending → Date.now() + (job.delay ?? 0) - priorityScore * 1000  (same as enqueue)
//        completed/failed → Date.now()
// pipeline: HSET jobs id JSON(job) ; ZREM processing id ; ZADD <statusSet> score id
//   ; when statusSet is completed/failed and the cap > 0:
//     ZREMRANGEBYRANK <statusSet> 0 -(cap+1)   // keep newest `cap`, drop oldest
```

So to retry, set `status` to e.g. `"retrying"` (or `"pending"`) and call `updateStatus` — it lands back in `pending` scored **exactly like `enqueue`**: the job's `delay` and priority are re-applied, so setting `job.delay` to a backoff before acking actually defers redelivery. Terminal sets (`completed`/`failed`) keep plain completion-time (`Date.now()`) scores. To finish, set `"completed"`/`"failed"`.

The `:completed`/`:failed` zsets are trimmed to `maxCompletedEntries`/`maxFailedEntries` (default 10000) on each terminal transition — oldest entries drop first — so they can't grow unbounded. Pass `0` (or a negative) to disable trimming and keep the full history.

### Others

- **`getJob(id)`** — `HGET jobs id` → parsed job or `null`.
- **`cancelJob(id)`** — `ZREM pending id`; if it removed something, `HDEL jobs id` and return `true`. Only cancels **pending** jobs (not in-flight/processing ones).
- **`getStats()`** — `ZCARD` of pending/processing/completed/failed in parallel (`Promise.all`).
- **`clear()`** — `DEL` all five keys.

## Example

```ts
import { RedisQueue, type QueueJob } from "@damatjs/redis";

// Redeliver jobs whose worker died without acking within 60s (optional).
const queue = new RedisQueue<{ orderId: string }>("orders", undefined, {
  visibilityTimeoutMs: 60_000,
});

await queue.enqueue({
  id: crypto.randomUUID(),
  queue: "orders",
  data: { orderId: "123" },
  status: "pending",
  priority: "high",
  attempts: 0,
  maxAttempts: 3,
  createdAt: new Date(),
});

// Worker tick (you own the loop)
const jobs = await queue.dequeue(10);
for (const job of jobs) {
  try {
    await handle(job.data);
    job.status = "completed";
    job.completedAt = new Date();
  } catch (e) {
    job.attempts += 1;
    job.error = String(e);
    job.status = job.attempts < job.maxAttempts ? "retrying" : "failed";
    job.delay = 2 ** job.attempts * 1000; // backoff — honored by the re-queue
  }
  await queue.updateStatus(job);
}

const stats = await queue.getStats();
```

## Gotchas

- **No built-in worker / scheduler.** Polling cadence, concurrency, and retry timing are the caller's job.
- **The visibility timeout is opt-in and disabled by default.** Without `visibilityTimeoutMs`, a job stuck in `processing` (e.g. worker crashed) is **never** auto-returned to `pending` — existing callers that track job state externally and never ack rely on this. With it enabled, reclaim only happens _on dequeue_ (no background reaper), and a **slow** worker that outlives the timeout gets its job redelivered — pick a timeout comfortably above your worst-case handling time, and ack via `updateStatus`.
- **`delay` sticks across retries.** A re-queue via `updateStatus` re-applies whatever `delay` is on the job record — set it to your backoff before acking, and clear (or overwrite) it when you _don't_ want the original enqueue delay deferring every redelivery. Visibility-timeout **reclaims** are the exception: the Lua script returns stale jobs with score `now` (immediately due), without re-applying priority or delay.
- **`cancelJob` only affects pending jobs.** In-flight jobs can't be cancelled through it.
- **`createdAt`/`startedAt`/`completedAt` are `Date`s** but serialize to ISO strings through `JSON.stringify`; after `getJob`/`dequeue` they come back as **strings**, not `Date` objects — re-hydrate if you need `Date` methods.
- **`enqueue` does not enforce unique ids** — re-enqueuing the same id overwrites the hash entry and re-scores it in `pending`.

## Safe extension

Keep the five-key layout consistent if you add operations. For transitions that must be race-free across workers, use a Lua script in `scripts.ts` (see `DEQUEUE_SCRIPT`); pipelines are fine for single-writer transitions like `updateStatus`. Score conventions (`due-time − priority*1000` for `pending`, claim time for `processing`, `Date.now()` for the result sets) should be preserved so ordering, reclaim, and stats stay coherent.
