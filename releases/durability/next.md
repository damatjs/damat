# @damatjs/durability Unreleased

## Added

- Structural PostgreSQL executor and transaction client contracts.
- Process-wide optional default durability client.
- Ordered system-migration catalogs and shared durability tables.
- Read-only migration readiness validation with actionable missing metadata.
- Transactional `withIdempotency` claims, completed-result replay, expiration,
  concurrent duplicate serialization, and runtime JSON-result validation.

## Action required

Run `bun run db:migrate` before enabling durable jobs or events.

Configure a default durability client or pass an active transaction executor
when calling `withIdempotency`. Propagate the same key to external providers
when they support idempotency.
