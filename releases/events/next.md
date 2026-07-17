# @damatjs/events Unreleased

> Adds a PostgreSQL durable-event path alongside the existing ephemeral bus.

## Added

- Typed `DurableEventMap`, event policies, and stable named consumers.
- Transactional, idempotent outbox publishing with lineage, availability, full
  policy snapshots, and immutable publish activity.
- Ordered migrations for outbox, deliveries, attempts, activity, and logs via
  `@damatjs/events/migrations`.
- Durable event and activity inspection APIs.

## Changed / improved

- The package now depends on `@damatjs/durability` for PostgreSQL transaction
  ownership and shared handler idempotency.
- Ephemeral `EventBus`, Redis broadcast, and automatic model CRUD behavior are
  unchanged and never create durable rows.

## Breaking

- None. The durable API is additive and opt-in.

## Action required

Enable `services.events.durable`, configure PostgreSQL, and run
`bun damat-orm migrate:up` before calling `publishDurableEvent`. External side
effects still require provider-supported idempotency.

## References

- Current behavior: [events README](../../packages/core/events/README.md)
- Source: `packages/core/events/src/durable/`
