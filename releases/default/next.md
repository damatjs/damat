# @damatjs/default Unreleased

> Demonstrates PostgreSQL-canonical jobs/events with rebuildable Redis acceleration.

## What changed

The combined reference runtime explicitly configures 30-second healthy safety
scans, five-second degraded fallback, 10-second Redis liveness, 30-second
PostgreSQL worker snapshots, 100-row relay batches, and 90-day retention.

## Added

- Operational documentation for Redis ACL channel rules and recovery.
- Transactional acceleration wake-ups for the domain/job/event example.

## Breaking

- None.

## Action required

Run `bun run db:migrate`. Restricted Redis users must receive `&damat:*` and
`&damat-events`; persist the ACL in both Redis and container configuration.

## References

- Current behavior: [reference backend README](../../backend/default/README.md)
- Source: `backend/default/`
