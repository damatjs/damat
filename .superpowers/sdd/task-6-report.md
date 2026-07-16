# Task 6 Report — Fenced PostgreSQL Job Workers

## Outcome

Implemented the durable PostgreSQL job worker and atomically replaced the
Redis-backed package root and framework initializer.

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
- `JobWorker.start()` is idempotent. Staged stop awaits registration, stops
  claims, bounds the active drain, and leaves unfinished leases recoverable.
- The package root now uses one durable `JobMap` and definition registry,
  durable enqueue/inspection clients, and no raw Redis queue exports.
- Framework jobs configure PostgreSQL durability and no longer require Redis.

## GREEN evidence

```text
DATABASE_URL=... bun test packages/core/jobs
49 pass, 0 fail, 148 expect() calls

bun test framework initializer suites
5 pass, 0 fail, 11 expect() calls

bun run build --filter=@damatjs/jobs
4 successful, 0 failed

bun run build --filter=@damatjs/framework
21 successful, 0 failed

bun run lint --filter=@damatjs/jobs
0 errors

bun run lint --filter=@damatjs/framework
0 errors

Prettier check, changed-file 100-line gate, git diff --check
all clean
```

The standalone TypeScript public-surface check also passed with declaration
merging against `@damatjs/jobs`.

## Commit

Commit message: `feat: add fenced PostgreSQL job workers`

The exact hash is reported by the task runner immediately after commit creation.

## Baseline note

Repository-wide baseline failures documented by the controller remain outside
this task. All Task 6 focused tests, builds, lints, formatting, and line gates
pass.
