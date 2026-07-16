# @damatjs/jobs Unreleased

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
  registry in `stopping` until active handler code settles.
- Log byte caps use PostgreSQL's stored `jsonb` size, terminal activity captures
  the latest progress snapshot, and overflowing retry dates dead-letter without
  retaining a lease.

## Action required

Run `bun run db:migrate` after enabling `services.jobs`. This applies the shared
durability catalog followed by the jobs catalog. Replace `queueName` with
`queue`, replace string Redis priorities with numeric priorities, and migrate
raw queue inspection to the headless job clients.
