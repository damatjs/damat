# Task 6 Report — Fenced PostgreSQL Job Workers

## Outcome

Implemented the durable PostgreSQL job worker and atomically replaced the
Redis-backed package root and framework initializer. The review follow-up also
hardened worker shutdown, recovery loops, observability limits, retry overflow,
and framework startup requirements.

## RED evidence

Initial focused run:

```text
package root defineJob identity mismatch
missing ../../src/worker/claim
old worker RedisNotInitializedError
9 pass, 5 fail, 4 errors
```

This confirmed the tests exercised the missing durable worker and the split
definition registry rather than existing behavior.

Review-hardening RED runs then confirmed:

```text
4 worker lifecycle regressions failed
framework jobs initializer did not throw without databaseUrl
log byte cap, terminal progress, and retry overflow regressions failed
```

The added cancellation execution test found one adjacent ordering defect:
initial heartbeat cancellation aborted the signal before persisting the
cancelled terminal state.

The final lifecycle review added a focused RED run with 19 failures. It showed
that restart was accepted, pending stop calls did not share one promise,
registry persistence failures were swallowed, background finalization was not
observable or retryable, invalid options were accepted, and the emitted public
constructor exposed the dependency seam.

## Architecture delivered

- Concurrent due-work claims use `FOR UPDATE SKIP LOCKED`.
- Claim transactions fence runs with worker ID, lease token, and expiry while
  creating immutable attempts and activity.
- Expired leases close attempts as lost; cancellation and exhausted attempts
  settle without exceeding the attempt limit or executing again.
- Heartbeats renew the current lease and propagate persisted cancellation.
- Handler context persists sampled progress, redacted bounded logs, and exposes
  transactional idempotency.
- Success, retry, cancellation, and dead letter close run, attempt, and activity
  atomically. JSON-unsafe results follow the visible failure path.
- `JobWorker.start()` is idempotent while running. Polling and registry
  heartbeat use independent bounded recovery loops.
- Staged stop awaits registration and an in-flight poll, starts no post-stop
  handlers, marks the registry stopping, and bounds the active drain.
- A grace timeout aborts active handler signals and execution heartbeats.
  Unfinished leases become recoverable, while the registry is marked stopped
  only after handler code settles.
- Log caps use PostgreSQL's stored `jsonb` byte representation. Terminal
  activity includes the latest progress snapshot.
- Invalid retry dates dead-letter without retaining a stuck lease. Log
  persistence and terminal-transition failures remain visible and contained.
- Pre-handler cancellation now persists the cancelled state before honoring
  the aborted execution signal.
- Cancellation observed while a handler is running settles even when handler
  code ignores its abort signal and returns normally.
- Calling `stop()` before `start()` is a no-op and does not poison a later
  worker lifecycle.
- Worker instances are one-shot. Restart during or after stopping throws
  synchronously, while repeated starts remain idempotent only when running.
- Pending stop calls share one promise. Registry transition failures reject or
  are logged for background completion, never produce a false stopped state,
  and remain retryable.
- Worker options are validated synchronously, including heartbeat/lease safety
  and a 25-second registry heartbeat ceiling below the stale-worker window.
- The public declaration exposes only `constructor(options?: JobWorkerOptions)`;
  dependency injection lives behind a non-root-exported internal factory.
- The package root now uses one durable `JobMap` and definition registry,
  durable enqueue/inspection clients, and no raw Redis queue exports.
- Framework jobs configure PostgreSQL durability and no longer require Redis.
  Configuring them without `projectConfig.databaseUrl` fails startup.

## GREEN evidence

```text
DATABASE_URL=... bun test --timeout 20000
95 pass, 0 fail, 209 expect() calls
100% functions, 100% lines

DATABASE_URL=... bun test
262 pass, 0 fail, 597 expect() calls
100% functions, 100% lines

bun run build  # @damatjs/jobs
passed

bun run build  # @damatjs/framework
passed

bun run lint  # @damatjs/jobs
0 errors

bun run lint  # @damatjs/framework
0 errors

Prettier check, changed-file 100-line gate, git diff --check
all clean
```

The standalone TypeScript public-surface check also passed with declaration
merging against `@damatjs/jobs`.

## Commit

Original commit: `6b48716 feat: add fenced PostgreSQL job workers`

Follow-up commit message: `fix: harden PostgreSQL job worker lifecycle`

## Baseline note

The PostgreSQL container remains running. The isolated verification database
and role are removed after the final audit.
