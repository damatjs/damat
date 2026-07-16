# @damatjs/durability Unreleased

## Added

- Structural PostgreSQL executor and transaction client contracts.
- Process-wide optional default durability client.
- Ordered system-migration catalogs and shared durability tables.
- Read-only migration readiness validation with actionable missing metadata.
- Transactional `withIdempotency` claims, completed-result replay, expiration,
  concurrent duplicate serialization, and runtime JSON-result validation.
- Active transaction executor markers for composing idempotency with Damat
  transaction owners.

## Changed

- A caller-supplied `withIdempotency` executor must be actively marked by a
  Damat transaction owner. Pools, arbitrary query executors, and executors
  retained after a callback are rejected before the claim query.

## Action required

Run `bun run db:migrate` before enabling durable jobs or events.

Configure a default durability client or pass the executor received by an
active Damat transaction callback when calling `withIdempotency`. Custom
transaction adapters must mark the executor only for the callback lifetime.
Propagate the same key to external providers when they support idempotency.
