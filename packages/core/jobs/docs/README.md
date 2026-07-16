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

`JobWorker.start()` is idempotent. It registers a worker record before polling,
fills only free concurrency, and reports in-flight load on a heartbeat cadence
that is independent from polling. Transient poll and registry heartbeat errors
schedule bounded retries while the worker remains active.

`stop({ graceMs })` stops claims, awaits an in-flight poll, marks the worker as
stopping, and waits for active handlers up to the grace period. It then aborts
unfinished handler signals and their execution heartbeats, so the leases can
expire. The worker record is not marked stopped until those handlers settle.

## Registry invariant

The package root re-exports `definitions/registry.ts` and
`definitions/types.ts` directly. There is only one `JobMap` declaration target
and one global `defineJob` registry; the removed Redis compatibility files must
not be recreated beside them.
