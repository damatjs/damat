# @damatjs/jobs Unreleased

## Added

- Ordered PostgreSQL system migrations for job runs, attempts, immutable
  activity, structured logs, schedules, schedule activity, and deduplication.
- Internal definition defaults and a process-wide durable definition registry.
- Internal repositories and normalized row mappers for job storage.
- Transactional enqueue with delay, numeric priority, retry overrides,
  metadata, correlation IDs, and atomic deduplication replay.
- Internal run, attempt, activity, log, cancellation, and retry clients.

## Changed

- Job activity reads preserve identity order instead of transaction timestamp
  order.
- Supplying an executor to a job mutation requires an active Damat transaction
  wrapper before any SQL is issued.

## Action required

Run `bun run db:migrate` after enabling `services.jobs`. This applies the shared
durability catalog followed by the jobs catalog. Continue using the existing
public Redis-backed producer and worker API until the durable worker cutover.
