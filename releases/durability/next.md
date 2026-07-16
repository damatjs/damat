# @damatjs/durability Unreleased

## Added

- Structural PostgreSQL executor and transaction client contracts.
- Process-wide optional default durability client.
- Ordered system-migration catalogs and shared durability tables.
- Read-only migration readiness validation with actionable missing metadata.

## Action required

Run `bun run db:migrate` before enabling durable jobs or events.
