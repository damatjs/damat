# Job queue — `RedisQueue`

Covers `src/queue/` (`types.ts`, `constant.ts`, `queue.ts`).

## Responsibility

A Redis-backed **priority + delay** job queue. It provides storage and state-transition primitives (enqueue, dequeue a batch, update status, query, cancel, stats, clear). It is **not** a worker runtime — there is no polling loop, retry scheduler, or backoff. Callers (or a higher layer) own the consume loop and retry policy.

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
  delay?: number;        // ms to defer before the job becomes due
  metadata?: Record<string, unknown>;
}

interface QueueStats { pending: number; processing: number; completed: number; failed: number; }
```

`PRIORITY_SCORES` (`constant.ts`): `{ critical: 4, high: 3, normal: 2, low: 1 }`.

## Redis layout

For a queue named `<name>`, `keyPrefix = "queue:<name>"` and five keys are used:

| Key | Type | Holds |
| --- | --- | --- |
| `queue:<name>:jobs` | hash | `jobId → JSON(job)` (the full record) |
| `queue:<name>:pending` | zset | jobs waiting, scored by due-time-minus-priority |
| `queue:<name>:processing` | zset | jobs handed out, scored by dequeue time |
| `queue:<name>:completed` | zset | finished jobs, scored by completion time |
| `queue:<name>:failed` | zset | failed jobs, scored by completion time |

## Class API — `src/queue/queue.ts`

```ts
class RedisQueue<TData = unknown> {
  constructor(queueName: string, redis?: Redis); // redis ?? getRedis()
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
const priorityScore = PRIORITY_SCORES[job.priority] ?? 2;        // normal if unknown
const score = Date.now() + (job.delay ?? 0) - priorityScore * 1000;
// pipeline: HSET jobs id JSON(job) ; ZADD pending score id
```

The **score encodes due time and priority**: lower score = dequeued earlier. `delay` pushes the score into the future; higher priority subtracts up to `4000` ms, so a `critical` job effectively jumps ahead of `normal` jobs queued within ~3 s of it. The full job is stored in the `jobs` hash.

### `dequeue(count)`

1. `ZRANGEBYSCORE pending 0 now LIMIT 0 count` — pull up to `count` job ids whose score is **due** (`<= now`). Delayed jobs (future score) are skipped until due.
2. If none, return `[]`.
3. Pipeline per id: `ZREM pending id` + `ZADD processing now id` — atomically move them to "processing".
4. `HMGET jobs ...ids`, filter out `null`s, `JSON.parse` each → `QueueJob[]`.

`dequeue` returns the job **records** but does **not** mutate `status`/`startedAt`/`attempts` on them — the caller updates those fields and calls `updateStatus`.

### `updateStatus(job)`

Routes the job to a terminal/return set based on `job.status`:

```ts
const statusSet = job.status === "completed" ? "completed"
                : job.status === "failed"    ? "failed"
                : "pending";   // anything else (incl. "retrying"/"processing") → back to pending
// pipeline: HSET jobs id JSON(job) ; ZREM processing id ; ZADD <statusSet> Date.now() id
```

So to retry, set `status` to e.g. `"retrying"` (or `"pending"`) and call `updateStatus` — it lands back in `pending` with score `now` (i.e. immediately due; the requeue does **not** re-apply priority or delay). To finish, set `"completed"`/`"failed"`.

### Others

- **`getJob(id)`** — `HGET jobs id` → parsed job or `null`.
- **`cancelJob(id)`** — `ZREM pending id`; if it removed something, `HDEL jobs id` and return `true`. Only cancels **pending** jobs (not in-flight/processing ones).
- **`getStats()`** — `ZCARD` of pending/processing/completed/failed in parallel (`Promise.all`).
- **`clear()`** — `DEL` all five keys.

## Example

```ts
import { RedisQueue, type QueueJob } from "@damatjs/redis";

const queue = new RedisQueue<{ orderId: string }>("orders");

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
    job.status = "completed"; job.completedAt = new Date();
  } catch (e) {
    job.attempts += 1;
    job.error = String(e);
    job.status = job.attempts < job.maxAttempts ? "retrying" : "failed";
  }
  await queue.updateStatus(job);
}

const stats = await queue.getStats();
```

## Gotchas

- **No built-in worker / scheduler.** Polling cadence, concurrency, and retry timing are the caller's job. There is no visibility-timeout reaper: a job stuck in `processing` (e.g. worker crashed) is **not** auto-returned to `pending` — you must implement that sweep yourself (scan `processing` by score age).
- **Requeue loses priority/delay.** `updateStatus` always scores returned jobs with `Date.now()`. To preserve ordering on retry, `cancelJob` + `enqueue` instead (with backoff via `delay`).
- **`cancelJob` only affects pending jobs.** In-flight jobs can't be cancelled through it.
- **`createdAt`/`startedAt`/`completedAt` are `Date`s** but serialize to ISO strings through `JSON.stringify`; after `getJob`/`dequeue` they come back as **strings**, not `Date` objects — re-hydrate if you need `Date` methods.
- **`enqueue` does not enforce unique ids** — re-enqueuing the same id overwrites the hash entry and re-scores it in `pending`.

## Safe extension

Keep the five-key layout consistent if you add operations (e.g. a `requeueStuck()` reaper that scans `processing`). Use pipelines for multi-key atomic-ish transitions as the existing methods do. Score conventions (`due-time − priority*1000` for `pending`, `Date.now()` for the result sets) should be preserved so ordering and stats stay coherent.
