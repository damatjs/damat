# @damatjs/durability Unreleased

> Establishes the shared PostgreSQL contracts used by durable jobs and events.

## What changed

Durable packages share one transaction, migration, idempotency, worker,
inspection, redaction, logging, and maintenance foundation instead of owning
parallel infrastructure contracts.

## Added

- Structural PostgreSQL executor and transaction client contracts.
- Process-wide optional default durability client.
- Ordered system-migration catalogs and shared durability tables.
- Read-only migration readiness validation with actionable missing metadata.
- Transactional `withIdempotency` claims, completed-result replay, expiration,
  concurrent duplicate serialization, and runtime JSON-result validation.
- Active transaction executor markers for composing idempotency with Damat
  transaction owners.
- Fresh per-callback executor wrappers that remain invalid when an underlying
  pool client or transaction manager is reused. Invalidated wrappers reject
  direct queries before delegation.
- Observational worker registration, heartbeat/load updates, distinct stopping
  and stopped transitions, stale-state inspection, and capability metadata.
- Durable pause/resume controls unique by work kind and scope, with immutable
  actor-attributed activity and maintenance activity records.
- Explicitly HMAC-signed versioned inspection cursors, time buckets, progress
  sampling, visibility types, and UUID lease-token creation.
- Immutable nested key/path redaction and chronological bounded work-log
  retention with explicit dropped-count and dropped-byte reporting.
- Ordered bounded cleanup for expired idempotency keys.
- Shared work-actor validation plus bounded summary and retention request
  contracts for jobs and durable-event inspection clients.

## Changed

- A caller-supplied `withIdempotency` executor must be actively marked by a
  Damat transaction owner. Pools, arbitrary query executors, and executors
  retained after a callback are rejected before the claim query.
- A caller-supplied pause/resume executor must also be an active Damat
  transaction executor so control state and its activity row cannot diverge.
- Pause/resume activity is returned in serialized write order rather than
  transaction-start timestamp order.
- Cursor APIs require an explicit nonempty signing key and canonical ISO
  timestamp/UUID.
- Work-log count and byte limits reject non-finite and fractional values.
- Operational summary filters use half-open ranges and reject invalid dates,
  fractional intervals, invalid stale thresholds, reversed ranges, and ranges
  intersecting more than 1,000 buckets.

## Action required

Run `damat-orm migrate:up` before enabling durable jobs or events.

Configure a default durability client or pass the executor received by an
active Damat transaction callback when calling `withIdempotency`. Custom
transaction adapters must create and invalidate a fresh wrapper for every
callback.
Propagate the same key to external providers when they support idempotency.
Use the worker registry for visibility only; keep fenced leases authoritative
for every claim. Run pause and resume inside an existing active Damat
transaction only when composing them with other database work.
Provide a stable application secret to both `encodeCursor` and `decodeCursor`;
rotating that key invalidates existing pagination cursors.
Validate the caller's actor before invoking an administrative mutation, and use
bounded summary ranges when building operational views.

## Breaking

- Caller-supplied executors must be active Damat transaction wrappers.
- Inspection cursors require an explicit signing key.

## References

- Current behavior: [durability README](../../packages/core/durability/README.md)
- Source: `packages/core/durability/src/`
