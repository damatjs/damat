# @damatjs/events Unreleased

> Adds a PostgreSQL durable-event path alongside the existing ephemeral bus.

## Added

- Typed `DurableEventMap`, event policies, and stable named consumers.
- Transactional, idempotent outbox publishing with lineage, availability, full
  policy snapshots, and immutable publish activity.
- Ordered migrations for outbox, deliveries, attempts, activity, and logs via
  `@damatjs/events/migrations`.
- Durable event and activity inspection APIs.
- Transactional `SKIP LOCKED` routing with stable named-consumer snapshots,
  including inspectable zero-consumer events.
- Exact event/consumer delivery workers with fenced leases, independent retries,
  dead letters, cancellation, JSON-safe results, sampled progress, and bounded
  redacted structured logs.
- Shared lease recovery, bounded retry promotion and retention, worker registry
  state, optional strict Redis wake-ups, and ordered graceful shutdown.
- Delivery, attempt, and log lifecycle read APIs plus an ordered retention
  integrity migration.
- A headless durable-event inspection client with signed cursor pagination,
  event/delivery filters, operational views, repeatable-read detail timelines,
  configurable visibility, and recursive redaction.
- Bounded operational summaries for current state, throughput, processing and
  waiting duration, lease health, worker capacity, and grouped dead letters.
- Actor-required administrative cancellation, dead-letter retry, exact consumer
  pause/resume, and bounded retention with PostgreSQL audit history and
  post-commit wake-ups.
- Inspection indexes for event timestamps, lineage lookups, delivery lifecycle
  ranges, worker leases, and activity timelines.
- Consistent delayed-delivery operational views, range-bounded dead-letter
  summaries, redacted worker metadata, active-only capacity, and bounded detail
  control history with an explicit truncation signal.
- Complete attempt-level waiting history, immutable retry schedules, overdue
  router backlog age, and a deterministic 20-group dead-letter summary cap.

## Changed / improved

- The package now depends on `@damatjs/durability` for PostgreSQL transaction
  ownership and shared handler idempotency.
- Owned publishes wake the router only after commit. Caller-owned transactions
  intentionally rely on PostgreSQL polling until the caller commits.
- Ephemeral `EventBus`, Redis broadcast, and automatic model CRUD behavior are
  unchanged and never create durable rows.

## Breaking

- None. The durable API is additive and opt-in.

## Action required

Enable `services.events.durable`, configure PostgreSQL, and run
`bun damat-orm migrate:up` before calling `publishDurableEvent`. External side
effects still require provider-supported idempotency.
Attempts created before the inspection migration retain an unknown wait value;
waiting summaries exclude them instead of reporting a synthetic zero.

## References

- Current behavior: [events README](../../packages/core/events/README.md)
- Source: `packages/core/events/src/durable/`
