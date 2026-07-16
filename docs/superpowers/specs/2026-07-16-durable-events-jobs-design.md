# Durable Events and Jobs Design

## Status

Approved for implementation planning on 2026-07-16, including selectable
runtime modes and the operational visibility amendment.

## Goal

Make PostgreSQL the durable source of truth for Damat jobs and explicitly
durable events while keeping ordinary events lightweight. Redis remains an
optional wake-up transport. One application build can run as an HTTP server, a
dedicated job worker, a dedicated durable-event worker, a combined worker, or
an all-in-one process. The framework also provides explicit system migrations,
crash recovery, at-least-once delivery with idempotency support, and a complete
operational record suitable for tables, detail views, metrics, and controls.

## Scope

This design delivers Phase 7 of the Damat v1 roadmap:

- a shared `@damatjs/durability` infrastructure package;
- PostgreSQL-backed jobs, attempts, schedules, deduplication, and dead letters;
- transactional durable-event outbox and per-consumer delivery;
- fenced leases, heartbeat, cancellation, retry, reconciliation, and retention;
- idempotency APIs;
- `server`, selectable `worker`, and `all` framework runtime modes;
- persisted lifecycle activity, progress, structured logs, and inspection APIs;
- explicit system migrations and actionable startup failures;
- repository lint and formatter cleanup required before feature work.

Durable pipelines, provider infrastructure, full generated-app scaffolding,
registry hosting automation, cron parsing, and automatic model-event durability
remain outside this phase.

## Architectural Boundaries

### `@damatjs/durability`

The new package lives at `packages/core/durability` and owns shared PostgreSQL
infrastructure:

- the `DurabilityExecutor` query contract;
- transaction helpers;
- versioned system-migration contracts and catalog composition;
- migration readiness checks;
- fenced lease value objects and SQL helpers;
- transactional idempotency storage;
- retention batch helpers;
- pagination, time-range, and operational summary primitives;
- structured work-log and redaction contracts;
- shared durability errors and test fixtures.

It does not define jobs, event handlers, HTTP routes, pipelines, or framework
configuration.

### `@damatjs/jobs`

The jobs package owns:

- typed job definitions and handlers;
- enqueue, inspect, cancel, retry, and scheduling APIs;
- job-run, attempt, schedule, and deduplication migration descriptors;
- PostgreSQL repositories and state transitions;
- the job worker and job reconciler;
- job activity, progress, logs, metrics, and administrative operations;
- optional Redis wake-up publishing and subscription.

### `@damatjs/events`

The events package keeps `EventBus` and Redis broadcast behavior unchanged for
ordinary events. It additionally owns:

- durable event policies;
- named durable consumers;
- outbox publishing;
- outbox and delivery migration descriptors;
- routing and delivery workers;
- delivery activity, progress, logs, metrics, and administrative operations;
- retry, dead-letter, inspection, and retention behavior.

There is no implicit forwarding between `EventBus.emit()` and durable events.

### `@damatjs/framework`

The framework composes configuration, database access, optional Redis wake-ups,
selectable worker capabilities, readiness checks, HTTP serving, and ordered
shutdown. It re-exports the public durability, jobs, and events surfaces but
does not duplicate their logic.

### ORM migration packages

`@damatjs/durability` defines the system-migration contract. Jobs and events
export their own ordered migration catalogs using that contract.
`@damatjs/orm-cli` loads enabled built-in catalogs alongside app and module
migrations. It shows them in status output and applies them only when the user
runs the normal migration command.

Framework startup never creates or alters durability tables.

## Database Contract

All system tables use the `_damat_` prefix. Migration identifiers are stable,
ordered, and namespaced by package. Migration application is tracked by the
existing ORM migration tracker rather than a competing tracker.

### Shared idempotency table

`_damat_idempotency_keys` stores:

- scope and key as the unique identity;
- status: `running` or `completed`;
- optional JSON result;
- creation, completion, and expiration timestamps;
- the owning operation metadata needed for inspection.

Database-only side effects use one transaction for the idempotency row, domain
writes, and completion. External providers must receive the same idempotency key
because no local database can make a remote side effect exactly once.

### Worker registry

`_damat_workers` stores each running worker process:

- stable process instance ID and selected capabilities;
- hostname, process ID, application metadata, and deployment metadata;
- start, last heartbeat, stopping, and stopped timestamps;
- configured concurrency and current in-flight count.

Worker processes register before polling, update heartbeats and load in bounded
intervals, mark graceful shutdown, and become visibly stale after heartbeat
expiry. The registry supports worker tables and capacity summaries without
making it part of claim correctness; fenced work leases remain authoritative.

### Job runs

`_damat_job_runs` stores:

- UUID, job name, queue name, JSON payload, and JSON metadata;
- status: `queued`, `running`, `retry_wait`, `succeeded`,
  `dead_lettered`, or `cancelled`;
- numeric priority and `available_at`;
- persisted retry values and attempt count;
- lease owner, lease token, lease expiry, and heartbeat timestamp;
- cancellation request and completion timestamps;
- optional schedule ID, scheduled occurrence time, and deduplication key;
- latest JSON progress, optional JSON result summary, and correlation ID;
- structured last-error data and lifecycle timestamps.

Indexes prioritize due work by queue, status, `available_at`, priority, and
creation time. A schedule occurrence is unique by schedule ID and occurrence
time.

### Job attempts

`_damat_job_attempts` stores one immutable record per execution attempt:

- run ID, attempt number, worker ID, and lease token;
- start, heartbeat, and finish timestamps;
- processing duration and optional JSON result summary;
- terminal attempt outcome;
- structured error data.

The unique key is run ID plus attempt number.

### Job activity and logs

`_damat_job_activity` is the immutable lifecycle timeline. Each row stores:

- run ID and optional attempt number;
- transition type, previous status, and next status;
- worker ID, lease token, and event timestamp;
- reason, duration, and structured JSON metadata;
- actor metadata for manual cancellation, retry, pause, or resume operations.

It records enqueue, claim, progress, heartbeat loss, lease recovery, retry
scheduling, cancellation, success, dead letter, manual retry, and retention
decisions.

`_damat_job_logs` stores bounded structured log entries:

- run ID, attempt number, timestamp, level, message, and JSON context;
- worker ID plus correlation and trace identifiers;
- sequence number for stable pagination.

Log limits apply per run and attempt. When a configured count or byte limit is
reached, the worker records one truncation activity entry rather than allowing
unbounded database growth.

### Job schedules

`_damat_job_schedules` supports:

- one-time schedules;
- fixed interval schedules;
- enabled state, payload, queue, priority, and retry policy;
- next and last occurrence timestamps;
- optional deduplication settings.

The schema reserves a schedule-kind value for future cron support, but v1
validation rejects cron schedules.

### Job deduplication

`_damat_job_deduplication` uniquely maps queue, job name, and deduplication key
to a run until its expiration time. A conflicting enqueue returns the existing
run. Reconciliation removes expired records in bounded batches.

### Durable event outbox

`_damat_event_outbox` stores:

- UUID, event name, JSON payload, and JSON metadata;
- policy version;
- optional idempotency, correlation, and causation keys;
- occurrence, availability, routing, and retention timestamps.

Publishing through a supplied transaction executor makes the domain write and
outbox insert atomic.

### Durable event deliveries

`_damat_event_deliveries` stores one row per event and stable consumer name:

- status: `pending`, `running`, `retry_wait`, `succeeded`,
  `dead_lettered`, or `cancelled`;
- persisted retry values and attempt count;
- availability and retention timestamps;
- fenced lease and heartbeat fields;
- latest JSON progress and optional JSON result summary;
- structured last-error data and lifecycle timestamps.

The unique key is event ID plus consumer name. One consumer failure cannot
rerun a consumer that already succeeded.

### Event attempts, activity, and logs

`_damat_event_delivery_attempts` stores one immutable execution attempt per
delivery, including worker and lease identity, start/finish time, duration,
outcome, result summary, and structured error.

`_damat_event_activity` stores the immutable routing and delivery timeline:
publish, routing, pending, claim, progress, lease recovery, retry, cancellation,
success, dead letter, and manual retry.

`_damat_event_logs` stores bounded, ordered structured logs scoped to event,
consumer, delivery, and attempt.

### Operational controls

`_damat_work_controls` stores durable pause state by work kind and scope:

- job queue or durable-event consumer identity;
- paused state, reason, actor metadata, and timestamps.

Workers check controls before claims. Pausing prevents new claims but does not
terminate work already running. Every pause and resume is written to the
relevant activity timeline.

## Query and Transaction Contract

`DurabilityExecutor` is a minimal structural interface with a typed `query`
method. It accepts the existing PostgreSQL pool, pool client, or an adapter
around the ORM transaction client without importing framework code.

`createDurabilityClient({ pool })` creates the shared client used by jobs,
events, idempotency, readiness, and retention. The framework configures one
process-wide default client after database initialization. Standalone consumers
pass a client directly or configure the default explicitly.

Public write APIs accept `executor?: DurabilityExecutor`:

- with an executor, the write participates in the caller's transaction;
- without one, the configured durability client opens its own transaction;
- without an executor or configured client, the call fails with a clear setup
  error;
- nested service transactions reuse the active transaction executor.

`ModuleService.transaction` additively passes the active transaction executor to
its callback. Existing callbacks that declare no argument remain valid.

## Job API and Behavior

`JobMap` declaration merging and `defineJob(name, handler, options)` remain the
typed definition model.

`enqueueJob(name, payload, options)` persists and returns a `JobRun`. Options
include queue, priority, delay, retry overrides, deduplication, metadata, and an
optional executor.

The handler receives `(payload, context)`. `JobRunContext` contains the run ID,
attempt number, maximum attempts, queue, metadata, lease-aware cancellation
signal, idempotency helpers, and:

```ts
progress(value: number | Record<string, unknown>, metadata?): Promise<void>;
log(level: WorkLogLevel, message: string, context?): Promise<void>;
```

`progress` updates the current run snapshot and writes a rate-limited history
entry when the value changes. `log` writes a structured work log and may mirror
it to the application logger. Neither operation can extend or replace a lost
lease. Handlers may return a JSON-safe result summary; `undefined` stores no
result and a non-serializable result fails completion visibly. The context no
longer exposes the Redis `QueueJob` type.

Inspection APIs expose run, attempt, schedule, cancellation, dead-letter retry,
pause, resume, logs, activity, summaries, and list operations. Raw Redis queue
access is not part of the v1 job API.

### Claim and execution

Workers claim due rows with `FOR UPDATE SKIP LOCKED` in bounded batches. The
claim transaction:

1. changes each run to `running`;
2. creates a unique lease token and expiry;
3. increments the attempt number;
4. inserts the attempt row;
5. returns the claimed work.

Every heartbeat and terminal update matches run ID, worker ID, and lease token.
A stale worker therefore cannot complete or retry work after another worker
reclaims it.

### Retry and dead letters

Retry values are copied onto every run at enqueue time. Failures calculate the
next `available_at` using persisted exponential backoff. Exhausted and unknown
jobs become `dead_lettered` with their attempt history preserved. An explicit
retry operation creates a new queued execution state without deleting history.

### Cancellation

Queued or waiting work is cancelled immediately. Running work records a
cancellation request; heartbeat refresh observes it and aborts the handler's
signal. Completion after a cancellation request records `cancelled`, although
handlers remain responsible for cooperating before irreversible side effects.

### Scheduling

The reconciler creates each due occurrence transactionally and advances
`next_run_at`. The occurrence uniqueness constraint prevents duplicate runs
when reconcilers overlap or restart.

## Durable Event API and Behavior

`defineDurableEvent(name, policy)` registers retry and retention defaults.

`defineDurableEventHandler(name, consumerName, handler, options)` registers a
stable named consumer. Consumer names must be unique per event. Durable wildcard
handlers are rejected. Its context provides the same cancellation, idempotency,
progress, structured-log, and JSON-safe result behavior as a job context.

`publishDurableEvent(name, payload, options)` inserts an outbox row and returns
the durable event record. Options include metadata, correlation, causation,
idempotency, availability, and an optional executor.

The outbox router claims unrouted events, snapshots the currently registered
named consumers into delivery rows, and marks the event routed in one
transaction. An event with no registered consumer is still marked routed and
remains inspectable until retention removes it.

Delivery workers claim, heartbeat, execute, retry, and dead-letter each consumer
delivery independently using the same fenced-lease rules as jobs.

Automatic `ModuleService` CRUD events continue to use the ephemeral event bus.

## Idempotency API

`withIdempotency(options, operation)` runs database work once per scope and key.
The operation receives the transaction executor and can return a JSON-safe
result. A completed duplicate returns the stored result without rerunning the
operation.

The API guarantees atomic deduplication for database effects performed with the
provided executor. For remote calls, handlers must also pass the key to a
provider that supports idempotency. Documentation states this boundary
explicitly and never claims general exactly-once execution.

## Operational Visibility

Operational state is part of the durable domain model. It is not reconstructed
from console output and does not depend on Redis streams.

Every state transition updates the current work row and appends its activity row
in the same PostgreSQL transaction. A dashboard can therefore use current tables
for fast lists and immutable activity for the detailed timeline without the two
sources disagreeing.

### Headless inspection clients

Jobs and events expose typed inspection clients rather than automatic HTTP
routes. Applications may mount their own authenticated administration API or
connect a future Damat dashboard.

List queries support cursor pagination, stable sorting, and filters for:

- lifecycle status and availability time;
- queue, job name, event name, and consumer;
- worker identity and active or stale lease;
- creation, start, finish, and failure time ranges;
- correlation, causation, schedule, and deduplication identifiers.

Detail queries return:

- payload and metadata according to visibility policy;
- current state, progress, result summary, and timing;
- attempts and retry schedule;
- structured errors;
- ordered activity and structured logs;
- lease and worker history;
- manual cancellation, retry, pause, and resume history.

### Operational summaries

SQL-backed summary APIs provide:

- current counts grouped by status;
- completion, failure, retry, cancellation, and recovery counts;
- processing and waiting-duration distributions;
- oldest waiting age and next scheduled work;
- active workers, active leases, and stale leases;
- worker capabilities, concurrency, in-flight load, and heartbeat age;
- dead-letter totals and recent failure groups;
- throughput grouped by time bucket, queue, job, event, or consumer.

These summaries are the stable data contract for later tables, charts, alerts,
and external telemetry adapters. Phase 7 does not ship a visual dashboard or add
an OpenTelemetry dependency.

### Progress and structured logs

Progress is a current snapshot plus a bounded history:

- the latest value is stored on the run or delivery for fast table rendering;
- changed values append activity according to a configurable minimum interval;
- terminal progress is always recorded;
- progress writes require the current fenced lease.

Work logs are separate from the general application log:

- they are scoped to one run or delivery and one attempt;
- entries use `debug`, `info`, `warn`, or `error`;
- ordering uses database sequence values, not clock time alone;
- configured key and path redaction is applied before persistence;
- count, byte, age, and terminal-state retention limits are configurable;
- inspection results expose when logs were truncated or redacted.

Payloads and results remain available to the worker as required for execution.
Inspection visibility can independently be `full`, `metadata`, or `hidden`, with
configured redacted paths applied before data leaves the inspection client.

### Administrative operations

Headless APIs support:

- cancel queued or running work;
- retry dead-lettered work while preserving previous history;
- pause and resume a job queue or durable-event consumer;
- inspect schedules and enable or disable them;
- request bounded retention cleanup.

Each operation requires actor metadata from the caller and appends an immutable
activity entry. Damat does not expose unauthenticated administration endpoints
automatically.

## Redis Wake-Ups

Redis is optional and never stores canonical job or delivery state.

After a successful enqueue, publish, retry, or schedule operation, the package
may publish a small wake-up message containing only the work category and queue.
Workers wake immediately when connected and continue periodic PostgreSQL polling
when Redis is absent, disconnected, or loses a message.

Redis outage logs a warning and reduces responsiveness to the poll interval. It
does not fail a PostgreSQL write or make durable work unavailable.

## Framework Runtime Modes

The same project build and container image support every runtime shape. Process
selection changes through configuration or environment variables; no separate
worker application or generated entry point is required.

The top-level app config gains:

```ts
runtime?: {
  mode?: "server" | "worker" | "all";
  workers?: Array<"jobs" | "events">;
  shutdownGraceMs?: number;
}
```

The default mode is `all`. When `runtime.workers` is omitted, the framework
selects the durable worker capabilities enabled under `services`. An application
with no durable services therefore keeps its existing HTTP-only behavior.

- `server`: initializes shared services, modules, durable publishers, and HTTP.
  It can enqueue jobs and publish durable events but starts no background worker
  loops.
- `worker`: initializes shared services and modules, then starts only the worker
  capabilities selected by `runtime.workers`. It does not build or serve the
  HTTP router.
- `all`: starts HTTP and the selected worker capabilities. This remains the
  local-development and backward-compatible default.

The first worker capabilities are:

- `jobs`: job claims, job execution, schedules, job reconciliation, and job
  retention;
- `events`: outbox routing, durable-event delivery, event reconciliation, and
  event retention.

The worker list is extensible. Phase 8 can add `pipelines` without introducing a
new runtime mode.

### Environment overrides

Environment variables override `damat.config.ts` independently:

```bash
DAMAT_RUNTIME_MODE=server
DAMAT_WORKER_TYPES=jobs,events
```

- `DAMAT_RUNTIME_MODE` accepts `server`, `worker`, or `all`.
- `DAMAT_WORKER_TYPES` is a comma-separated list of worker capabilities.
- Whitespace and duplicate worker names are normalized.
- Unknown modes or worker names fail startup with an actionable error.
- `worker` requires at least one enabled worker capability.
- `all` may run with zero workers when no durable service is enabled.
- `server` always starts zero workers, even if a worker list is configured.

This supports:

```bash
# HTTP only
DAMAT_RUNTIME_MODE=server

# jobs only, no HTTP
DAMAT_RUNTIME_MODE=worker DAMAT_WORKER_TYPES=jobs

# durable events only, no HTTP
DAMAT_RUNTIME_MODE=worker DAMAT_WORKER_TYPES=events

# jobs and durable events, no HTTP
DAMAT_RUNTIME_MODE=worker DAMAT_WORKER_TYPES=jobs,events

# HTTP plus all configured workers
DAMAT_RUNTIME_MODE=all DAMAT_WORKER_TYPES=jobs,events
```

`services.durability` configures polling, leases, heartbeat, retention batches,
Redis wake-ups, progress sampling, structured-log limits, redaction, and
inspection visibility. `services.jobs` configures job workers and schedules.
`services.events` keeps ordinary Redis broadcast settings and adds explicit
durable-event worker settings.

Durable jobs or events require `projectConfig.databaseUrl`. Missing database
configuration fails startup. Missing or outdated system migrations fail startup
with the exact `damat-orm migrate:up` command. Ordinary events and applications
that do not enable durability keep database configuration optional.

## Startup and Shutdown

Startup order is:

1. load config and logger;
2. resolve runtime mode and worker capabilities from config and environment;
3. initialize PostgreSQL and optional Redis;
4. initialize modules and register job/event definitions;
5. validate required system-migration versions;
6. initialize durable clients;
7. start only the selected worker loops for `worker` or `all`;
8. build and start HTTP only for `server` or `all`.

An explicitly selected worker capability that is not enabled in `services`
fails startup instead of silently doing nothing. Multiple containers may run
the same worker capability safely because PostgreSQL claims use `SKIP LOCKED`
and fenced leases.

Shutdown handlers execute in explicit phases rather than concurrently:

1. stop accepting new HTTP work;
2. stop wake-up subscriptions and polling;
3. wait up to `shutdownGraceMs` for active handlers;
4. stop heartbeat and reconciliation loops;
5. close Redis;
6. close PostgreSQL;
7. flush and close the logger.

Unfinished work keeps or expires its lease and is recovered from PostgreSQL.
Each shutdown failure is logged and later phases still run.

## Reconciliation and Retention

Each selected worker capability runs its bounded, repeatable reconciliation
passes:

- reclaim expired job and delivery leases;
- move due retry rows back into claimable state;
- create due schedule occurrences;
- remove expired deduplication and idempotency records;
- delete terminal attempts, runs, deliveries, outbox rows, activity, and logs
  according to configured retention;
- preserve the current pause controls and active-work records.

Each pass is safe with multiple reconcilers and after process restarts.

## Failure Semantics

- Delivery is at least once.
- A committed PostgreSQL record is never considered lost because Redis failed.
- A stale lease token cannot write heartbeat or terminal state.
- A handler exception is recorded in its attempt and produces retry or dead
  letter state according to persisted policy.
- Unknown job or consumer definitions produce visible dead letters.
- Migration, database, or invalid configuration failures abort startup.
- Wake-up transport failures warn and fall back to polling.
- Progress or work-log writes from a stale lease cannot mutate durable work.
  The stale worker logs locally, while the reconciler or new claimant records
  the authoritative lease-recovery activity.
- Operational log truncation is visible and never fails the handler.
- A non-limit work-log persistence failure is not swallowed; the handler loses
  successful completion and follows normal retry or recovery behavior.
- Shutdown timeout warns and leaves work recoverable through lease expiry.
- No failure path silently creates tables, drops history, or reports success.

## Repository Cleanup Preflight

Before feature implementation:

- Biome remains formatter and linter owner for `apps/docs`, `apps/web`, and
  `apps/registry`;
- Prettier ignores those Biome-owned trees and generated/build artifacts;
- Prettier formats the remaining owned source and documentation;
- `backend/default` uses the repository's available `oxlint` command rather
  than an uninstalled ESLint binary;
- full lint, Prettier check, type checks, and existing tests establish the
  baseline;
- unrelated behavior is not changed merely to hide a lint failure.

This cleanup is a separate checkpoint commit before durability code.

## Testing Strategy

All behavior changes follow red-green-refactor. Every new or modified code,
test, script, fixture, and generated-code file stays at or below 100 physical
lines.

### Unit tests

Cover:

- retry and retention calculations;
- state-transition validation;
- migration catalog ordering and readiness errors;
- lease-token matching;
- schedule validation and next occurrences;
- idempotency duplicate results;
- cursor pagination and stable ordering;
- progress sampling, log limits, and redaction;
- operational summary time buckets;
- worker heartbeat and stale-state calculation;
- runtime-mode defaults and validation;
- Redis wake-up fallback.

### PostgreSQL integration tests

Cover:

- atomic domain write plus job enqueue;
- atomic domain write plus event outbox publish;
- concurrent `SKIP LOCKED` claims without double claim;
- stale lease rejection and expired-lease recovery;
- retries, dead letters, explicit dead-letter retry, and cancellation;
- overlapping schedule reconcilers creating one occurrence;
- event fan-out with independent consumer outcomes;
- idempotent database side effects;
- atomic current-state and activity transitions;
- ordered progress and structured-log persistence;
- worker registration, load heartbeat, graceful stop, and stale detection;
- pause/resume controls preventing new claims;
- inspection filtering, timelines, summaries, and actor history;
- log truncation and retention without handler failure;
- retention and reconciliation batches;
- recovery after simulated worker and Redis loss.

Database integration suites may skip only when their documented test database
is unavailable. Phase completion requires running them against PostgreSQL.

### Framework and package tests

Cover:

- `server`, jobs-only worker, events-only worker, combined worker, and `all`
  boot behavior;
- environment precedence, normalization, and invalid runtime selection;
- server mode never starting a worker loop;
- worker mode never building or serving HTTP;
- missing database and missing-migration startup errors;
- ordered shutdown and grace timeout;
- existing ephemeral event compatibility;
- typed job and durable-event declaration merging;
- no automatic unauthenticated administration routes;
- package builds, type checks, lints, and public exports.

### Phase exit verification

The phase is complete only when:

- focused package tests pass;
- PostgreSQL recovery integration tests pass;
- Redis-loss tests show polling recovery;
- worker-crash tests show lease recovery;
- idempotent database-effect tests show no duplicate side effect;
- inspection tests show complete current, retry, failure, and activity views;
- progress, logs, metrics, and controls remain correct across recovery;
- full repository build, lint, type checks, tests, formatting, and line checks
  pass.

## Documentation and Release Records

Implementation updates current living docs for durability, jobs, events, ORM
migrations, ORM CLI, services, framework configuration, framework startup and
shutdown, the guide, and the reference backend where behavior is demonstrated.

Every observably changed package receives `releases/<package>/next.md` and an
updated package release index. No package version is bumped during Phase 7.

## Implementation Checkpoints

Implementation planning must split the phase into independently reviewable,
testable tasks:

1. repository cleanup preflight;
2. durability package contracts, migration catalog, and readiness;
3. transactional idempotency;
4. worker registry, activity, structured logs, controls, and inspection query
   primitives;
5. job storage and enqueue/inspection APIs;
6. job claims, worker, progress, retries, cancellation, and dead letters;
7. schedules, reconciliation, retention, and Redis wake-ups;
8. durable event outbox and named consumer APIs;
9. event routing, delivery workers, activity, progress, and logs;
10. operational summaries and administrative inspection clients;
11. framework runtime modes, worker selection, startup validation, and ordered
    shutdown;
12. integration tests, living docs, release records, and full verification.

Each checkpoint is reported to the user and requires approval before the next
implementation task begins.
