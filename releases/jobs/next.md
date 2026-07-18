# @damatjs/jobs Unreleased

> Moves background work to PostgreSQL-backed runs with fenced workers and headless operations.

## What changed

Jobs use PostgreSQL as their canonical store, with persisted attempts, leases,
retries, schedules, progress, logs, results, controls, and recovery. Redis is an
optional post-commit wake-up path rather than the queue of record.

## Added

- Ordered PostgreSQL system migrations for job runs, attempts, immutable
  activity, structured logs, schedules, schedule activity, and deduplication.
- Internal definition defaults and a process-wide durable definition registry.
- Internal repositories and normalized row mappers for job storage.
- Transactional enqueue with delay, numeric priority, retry overrides,
  metadata, correlation IDs, and atomic deduplication replay.
- Internal run, attempt, activity, log, cancellation, and retry clients.
- Pre-SQL validation for identifiers, PostgreSQL integer ranges, safe
  millisecond values, delays, and deduplication expiration dates.
- Fenced PostgreSQL workers with concurrent `SKIP LOCKED` claims, durable
  heartbeats, cancellation signals, progress, structured logs, JSON results,
  retries, dead letters, and staged graceful stop.
- The durable enqueue and headless inspection clients at the package root.
- One-time and fixed-interval schedule creation, updates, listing, atomic
  occurrence reconciliation, optional deduplication TTL, and cron rejection.
- Bounded lease, retry, deduplication, terminal-history, and idempotency
  reconciliation owned by each job worker.
- Actor-attributed retention request outcomes in maintenance activity.
- Optional Redis wake-up publication and a dedicated duplicated subscriber,
  with PostgreSQL polling retained as the fallback.
- Signed cursor job lists, repeatable-read detail timelines, bounded operational
  summaries, and actor-audited headless administration.
- Inspection indexes for cursor, status, queue, lineage, lease, terminal,
  activity, and attempt summary paths in jobs system migration `003`.
- Transactional acceleration signals for enqueue, retry, schedules, controls,
  and inspection changes, including caller-owned transactions.
- Batched fenced lease renewal for every execution owned by one worker.

## Changed

- Job activity reads preserve identity order instead of transaction timestamp
  order.
- Supplying an executor to a job mutation requires an active Damat transaction
  wrapper before any SQL is issued.
- Millisecond policy and duration columns use `BIGINT`; mapping rejects values
  outside JavaScript's safe integer range.
- Scheduled runs require `schedule_id` and `scheduled_for` together, retain
  their referenced schedule, and remain unique per occurrence.
- Attempt-scoped activity and logs require an existing attempt. Duration and
  schedule policy constraints reject negative values.
- Repeating cancellation of a running job preserves the first request
  timestamp and does not duplicate activity.
- `JobMap`, `defineJob`, and registry access now resolve to the durable
  definition registry. Handler context no longer exposes Redis queue records.
- Raw `getJobQueue` and `clearJobQueues` exports are removed. PostgreSQL is the
  canonical job store; Redis is not required by the worker.
- Worker polling and registry heartbeats recover from transient failures on
  independent bounded retry loops.
- Graceful stop now waits for an in-flight poll, starts no post-stop handlers,
  aborts unfinished execution heartbeats after grace expires, and keeps the
  registry in `stopping` until active handler code settles. Registry heartbeat
  and reconciliation maintenance stay active during the drain and stop after
  the graceful drain phase, before the final stopped state is persisted.
- Expired-lease recovery now has one transition path for reconcilers and
  claimers. Recovery activity preserves the expired worker and token; an
  immediate reclaim records a distinct subsequent claim with its new identity.
- Log byte caps use PostgreSQL's stored `jsonb` size, terminal activity captures
  the latest progress snapshot, and overflowing retry dates dead-letter without
  retaining a lease.
- Worker instances are explicitly one-shot. Running `start()` calls remain
  idempotent, while restart during or after stop now throws synchronously.
- Stop persistence errors are no longer swallowed. Pending callers share the
  same stop promise, failures remain retryable, and background finalization
  failures are logged without falsely marking the worker stopped.
- Public worker construction validates identities, concurrency, timing,
  heartbeat-to-lease safety, progress cadence, and log limits. Registry
  heartbeat cadence is capped at 25 seconds, below the stale-worker window.
- Concurrency is bounded by PostgreSQL's signed 32-bit range, timers and
  durations by the runtime's 2,147,483,647 ms timeout maximum, and log limits
  by JavaScript's safe-integer range. Graceful-stop duration validates
  synchronously before lifecycle mutation and accepts zero for immediate abort.
- The public `JobWorker` constructor accepts only worker options; dependency
  injection moved to an internal, non-root-exported test seam.
- Package-owned and active caller-owned Damat transactions write outbox signals
  atomically and request one coalesced relay flush after commit. Rollback
  requests no wake-up; the PostgreSQL safety poll remains the final fallback.
- Manual retry clears current progress, result, error, cancellation, completion,
  and lease snapshots while preserving immutable attempt and activity history.
- Operational summary time windows are half-open; current status, waiting,
  lease, worker, and dead-letter state remains global rather than windowed.
- Queue-control detail history is capped at 500 records and reports
  `controlHistoryTruncated` instead of silently truncating.
- Waiting duration measures `started_at - available_at`; worker capacity sums
  active workers only, and grouped failure messages honor redaction.
- Repeating a cancellation after its request was persisted is idempotent and
  does not append duplicate activity.
- Throughput is keyed by time bucket, queue, and job name. Worker summaries add
  bounded active/stale capability, load, heartbeat, and visibility-aware
  metadata records; stopping and stopped history is excluded.
- The activity summary index now leads with `occurred_at` to match bounded
  count scans before grouping by type.
- Retention resolves its default deduplication cutoff once and reuses it across
  request audit, deletion, and outcome audit; terminal cutoffs remain unchanged.
- Waiting-duration samples are selected by half-open `started_at` ranges, so
  runs crossing either side of the report window are attributed correctly.
- Migration `003` adds attempt `available_at` and `wait_ms`; every claim captures
  both atomically and summaries use immutable attempts. Retry activity preserves
  each effective `availableAt`, including manual retries.
- Existing attempts retain `NULL` wait timing and are excluded from waiting
  distributions; the migration does not misrepresent unknown history as zero.
- Inspection clients reject missing, empty string, and empty byte-array cursor
  signing keys at creation instead of waiting for the first cursor operation.
- Hidden inspection detail omits worker application and deployment metadata,
  matching hidden worker summaries and the documented visibility contract.
- Framework-managed workers use one adaptive coordinator: healthy Redis leaves
  a 30-second safety scan, degraded operation polls within five seconds, worker
  snapshots persist every 30 seconds, and retention defaults to 90 days or
  accepts `"forever"`.
- Pipeline-owned jobs write a pipeline wake-up outbox row inside every fenced
  terminal transaction. Job retention skips them so pipeline retention can
  delete the graph and its backing jobs as one ownership unit.
- Framework-only terminal notification is isolated under the
  `@damatjs/jobs/pipeline-integration` subpath.

## Action required

Run `damat-orm migrate:up` after enabling or updating `services.jobs`. This applies
the shared durability catalog followed by the jobs catalog. Replace `queueName`
with `queue`, replace string Redis priorities with numeric priorities, and
migrate raw queue inspection to the headless job clients. Construct a new `JobWorker`
instead of restarting a worker instance that has begun stopping.
Ensure an authenticated Redis user has the channel rule `&damat:*` when using
framework acceleration.

## Breaking

- Raw Redis queue exports are removed; use durable definitions, workers, and
  headless inspection clients.
- `queueName` becomes `queue`, and priorities are numeric.

## References

- Current behavior: [jobs README](../../packages/core/jobs/README.md)
- Source: `packages/core/jobs/src/`
