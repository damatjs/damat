# @damatjs/durability

Shared PostgreSQL contracts for durable Damat infrastructure.

The package provides a structural query interface, a transaction client,
versioned system-migration descriptors, the shared durability migration
catalog, worker presence, operational controls, and shared inspection
primitives. Jobs, durable events, and framework runtime behavior build on this
package without making it own their domain APIs.

## Client

```ts
import {
  createDurabilityClient,
  setDurabilityClient,
} from "@damatjs/durability";

const durability = createDurabilityClient({ pool });
setDurabilityClient(durability);

await durability.transaction(async (executor) => {
  await executor.query("INSERT INTO app_records (id) VALUES ($1)", ["rec_1"]);
});
```

`DurabilityExecutor` is the structural query contract accepted by durability
APIs. A PostgreSQL pool, pool client, or compatible ORM executor can implement
it. The default client uses
`Symbol.for("damatjs.durability.client")`; standalone consumers may pass a
client directly instead.

## Transactional idempotency

```ts
import { withIdempotency } from "@damatjs/durability";

const result = await withIdempotency(
  { scope: "payment.capture", key: requestId },
  async (executor) => {
    await executor.query(
      "INSERT INTO payment_attempts (id, status) VALUES ($1, $2)",
      [requestId, "captured"],
    );
    return { captured: true };
  },
);
```

The first caller claims the scope/key pair and stores its JSON-safe result in
the same PostgreSQL transaction as the operation. Concurrent duplicates wait
for that transaction and replay the completed value. Failures roll back the
claim with the database work, while an expired key may be claimed again.

Pass `executor` when the caller already owns a transaction. A supplied executor
must be the active callback executor from `createDurabilityClient().transaction`
or another Damat transaction owner such as `ModuleService.transaction`.
Unmarked pools and inactive executors are rejected before the claim query.
Without an executor, `withIdempotency` uses the configured default client.

`cleanupExpiredIdempotency({ limit, before, executor })` removes expired keys
in an ordered batch capped at 500 rows. Unexpired keys are preserved.

Transaction-adapter authors can use `createTransactionalExecutor` to create a
fresh query-delegating wrapper for each callback, then call
`invalidateTransactionalExecutor` in `finally`. The wrapper is active only for
that callback and stays invalid after both commit and rollback, even when the
adapter reuses its underlying client. Queries through an invalidated wrapper
fail before reaching that client. Application code should not create transaction
wrappers itself.

The guarantee covers database effects performed through the supplied executor.
Remote providers must receive the same idempotency key; a local transaction
cannot make an external side effect exactly once.

## Worker presence and controls

`registerWorker`, `heartbeatWorker`, `markWorkerStopping`, `stopWorker`, and
`listWorkers` maintain an observational process registry. Mark a process as
stopping before drain begins, then call `stopWorker` after drain completes.
Repeated shutdown calls preserve the first stopping and stopped timestamps.
`listWorkers` calculates active, stale, stopping, and stopped states from
heartbeat and shutdown timestamps. This data supports capacity views; it never
authorizes work claims, which require fenced leases owned by jobs or events.

`pauseWork` and `resumeWork` upsert the unique work-kind/scope control and append
immutable actor-attributed activity in one transaction. Activity identity
records the serialized control-write order. Without an executor, the configured
durability client opens that transaction. A supplied executor must be an active
Damat transaction executor. Pausing prevents future claims but does not
terminate work already running.

Headless administration clients call `validateWorkActor` before storage so an
operator ID and one of `user`, `service`, or `system` is always present.

## Inspection primitives

The package exports versioned opaque cursors containing a canonical ISO
timestamp and UUID, progress sampling, visibility policies, aligned time
buckets, UUID lease tokens, immutable key/path redaction, and chronological
bounded log retention that keeps one contiguous newest suffix.

`encodeCursor(position, signingKey)` and `decodeCursor(cursor, signingKey)`
require the application to provide the same explicit, nonempty HMAC key. Modified cursors
and cursors signed by another key are rejected across processes. Cursor signing
protects pagination state; it does not replace endpoint authentication. Log
limits require finite nonnegative integer count and byte values and report
dropped counts and bytes so truncation remains visible without failing a
handler.

`validateWorkSummaryFilter` validates the shared half-open summary range,
safe-integer interval, optional clock/stale threshold, and a maximum of 1,000
intersecting buckets. Jobs and events attach their fixed domain dimensions to
the returned buckets. `BoundedRetentionRequest` carries the common
terminal cutoff and batch-size request shape.

## Acceleration and retention control

PostgreSQL is the canonical record for durable work. `recordAccelerationSignal`
writes a coordination/invalidation row through the same transaction executor as
the state change. A framework relay publishes committed rows to Redis; rollback
removes both the state change and its signal. Relay claims are leased and
idempotent, so a crash after publication can produce a duplicate wake-up but
cannot duplicate a fenced PostgreSQL claim.

`getAccelerationHealth()` reports the mode, pending outbox count, publication
checkpoint, last successful publication and rebuild, and fallback interval.
`rebuildAccelerationProjection(actor)` rebuilds Redis coordination indexes from
PostgreSQL and audits the actor and reason. `subscribeDurableInvalidations`
provides an in-process hook for a future HTTP/SSE adapter. Invalidations contain
only resource identity, scope, and revision; consumers refetch canonical data.

`setRetentionOverride` and `getRetentionOverride` use
`number | "forever"`. Overrides are actor/reason audited and apply to remaining
data. Operational presets are seven days, 90 days, and `"forever"`; the default
is 90 days.

## System migrations

`durabilitySystemMigrations` declares shared idempotency, worker, control,
maintenance, acceleration outbox/state, and retention-override tables. Compose catalogs with
`collectSystemMigrations`, then pass the result to the ORM migration runner.

Framework startup never creates these tables. Use
`assertSystemMigrationsApplied` for a read-only readiness check; missing
migrations instruct the operator to run `damat-orm migrate:up`.

See [the internals guide](./docs/README.md) for the package map and contracts.
