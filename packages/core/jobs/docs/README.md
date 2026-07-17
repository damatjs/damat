# @damatjs/jobs — Internals

Maintainer notes for the PostgreSQL job runtime. See the package README for the
public usage surface.

## Module map

| Area             | Responsibility                                           |
| ---------------- | -------------------------------------------------------- |
| `definitions/`   | Typed definitions, defaults, and global registry.        |
| `client/`        | Enqueue, read, cancel, retry, activity, and log clients. |
| `repositories/`  | SQL records, mappers, and storage primitives.            |
| `context/`       | Fenced progress, structured logs, results, idempotency.  |
| `worker/`        | Claims, heartbeats, execution, outcomes, loop, and stop. |
| `schedules/`     | Once/interval validation, mutation, and occurrences.     |
| `wakeup/`        | Best-effort Redis publication and subscription.          |
| `migrations/`    | Ordered jobs system-migration catalog.                   |
| `tests/storage/` | Persistence and database-invariant tests.                |
| `tests/worker/`  | Concurrent claims, fencing, outcomes, context, and stop. |

## Claim transaction

`claimJobRuns` opens one durability transaction and selects due work with:

```sql
FOR UPDATE SKIP LOCKED
```

Rows sort by availability, priority, creation time, and ID. Durable queue
controls are checked in the same query. Each accepted row receives a unique
lease token, increments its attempt count, inserts the immutable attempt, and
appends claim activity before commit.

Expired running work closes the previous attempt as `lost`. A recoverable row
gets a new fenced attempt. An exhausted row dead-letters without exceeding
`max_attempts`; a cancellation-requested row settles as cancelled without
executing handler code again.

## Fencing and heartbeats

Every progress, log, heartbeat, success, retry, cancellation, or dead-letter
write matches:

- run ID;
- `running` status;
- worker ID;
- lease token;
- a lease expiry later than the database clock.

Heartbeat renews both the run lease and attempt heartbeat. It returns the
persisted cancellation state so the execution loop can abort the handler's
signal. Progress and logs never extend a lease.

## Execution context

`createJobRunContext` provides the stable handler contract:

- identity, attempt, queue, metadata, and cancellation signal;
- `progress` for the current snapshot and sampled activity;
- `log` for bounded ordered entries with configured redaction;
- `withIdempotency` for transactionally protected database effects.

Log truncation creates one activity record per attempt. Persistence failures
propagate into the handler execution and therefore follow ordinary failure
semantics. Results are recursively checked as JSON-safe before completion.

## Atomic outcomes

Success, retry, cancellation, and dead-letter transitions each:

1. update the fenced run and clear its lease;
2. close the current immutable attempt;
3. append lifecycle activity;
4. commit together.

Retries calculate the next availability from the policy copied onto the run.
An invalid or overflowing availability date forces a visible dead letter
instead of leaving a leased run in retry limbo.
Success rechecks cancellation under the same transaction, so a late
cancellation cannot be overwritten by a normal completion. Terminal activity
copies the latest progress snapshot so inspection does not depend on sampling.

## Worker lifecycle

`JobWorker.start()` is idempotent only while the same worker is running. Worker
instances are one-shot: `start()` rejects synchronously once stopping begins or
after the worker stops. It registers a worker record before polling, fills only
free concurrency, and reports in-flight load on a heartbeat cadence independent
from polling. Construction validates identity, concurrency, timing, progress,
and log-limit options. Registry heartbeat cadence cannot exceed 25 seconds and
the job heartbeat must remain shorter than the claim lease. Concurrency fits a
PostgreSQL signed integer, timer and duration values fit the runtime's
2,147,483,647 ms timeout range, and log limits are safe integers.

`stop({ graceMs })` stops claims, awaits an in-flight poll, marks the worker as
stopping, and waits for active handlers up to the grace period. Repeated calls
while stop is pending share the same promise. Registry heartbeats and recovery
reconciliation stay active during that drain. It then aborts unfinished handler
signals and their execution heartbeats, so the leases can expire, and stops the
maintenance loops after the graceful drain phase and before persisting the
final stopped state. The worker
record is not marked stopped until those handlers settle and the database write
succeeds. A persistence failure rejects or is logged for post-grace background
finalization; either path leaves `stop()` retryable. Grace is validated before
lifecycle mutation; zero requests an immediate abort and the runtime timeout
maximum is accepted.

## Registry invariant

The package root re-exports `definitions/registry.ts` and
`definitions/types.ts` directly. There is only one `JobMap` declaration target
and one global `defineJob` registry; the removed Redis compatibility files must
not be recreated beside them.

## Reconciliation and wake-ups

Every pass is bounded and safe under overlap. Expired leases close the old
attempt and recover from the fenced lease alone. Recovery activity preserves
the expired worker and token. Immediate reclaim records a separate `claimed`
transition from `queued` with the new identity. Due retries become claimable,
schedule occurrences advance atomically, and expired deduplication,
idempotency, and retained terminal runs are deleted in bounded batches.
Queue-scoped retention records actor-attributed requested, completed, or failed
maintenance activity; completion commits with its deletions.

Redis wake-ups carry only `{ kind: "jobs", queue }`. Publishers run after
package-owned PostgreSQL transactions commit. Mutations using a caller-owned
executor do not publish because the package cannot observe that outer commit.
The duplicated subscriber can wake the claim loop early, while periodic
PostgreSQL polling remains active and authoritative.
