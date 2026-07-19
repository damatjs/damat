# @damatjs/default Unreleased

> Demonstrates PostgreSQL-canonical jobs, events, and pipelines with rebuildable Redis acceleration.

## What changed

The combined reference runtime explicitly configures 30-second healthy safety
scans, five-second degraded fallback, 10-second Redis liveness, 30-second
PostgreSQL worker snapshots, 100-row relay batches, and 90-day retention.

The onboarding workflow now serializes ORM date values before its result enters
a durable pipeline. This prevents a committed user creation from being retried
and then dead-lettered because the backing job rejected `Date` instances.

The canonical repository runner now provisions Redis and a migrated recovery
database. Job and event SIGKILL recovery run in a dedicated process for both
healthy and unavailable Redis instead of being skipped or sharing mutable test
runtime state with the backend unit suite.

The reference deployment now fails unsafe production configuration, emits
structured JSON logs, protects Prometheus metrics, separates PostgreSQL
bootstrap/migration/runtime/backup roles, restricts authenticated Redis, and
hardens application containers. Production-readiness automation exercises
smoke, worker, load, backup/restore, security, and rollback gates.

## Added

- The reference backend exposes `bun run db:setup` for local clean-database
  creation and complete system/module migration.
- Operational documentation for Redis ACL channel rules and recovery.
- Transactional acceleration wake-ups for the domain/job/event example.
- A source-controlled onboarding pipeline that composes the existing saga
  workflow, durable event, and report job, plus a dedicated Compose worker role.
- Mandatory live and degraded Redis crash-recovery verification in the root
  test workflow.
- Production environment, immutable-image, secret, deployment, database-role,
  Redis ACL, protected metrics, live worker, load, backup/restore, and rollback
  acceptance tooling.

## Breaking

- None.

## Action required

Run `bun run db:setup` for a new local database or `bun run db:migrate` when the
database already exists. Restricted Redis users must receive `&damat:*` and
`&damat-events`; persist the ACL in both Redis and container configuration.

## References

- Current behavior: [reference backend README](../../backend/default/README.md)
- Source: `backend/default/`
