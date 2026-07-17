# @damatjs/orm-cli Unreleased

> Makes the app CLI select and report durable system migrations automatically.

## What changed

Before, the CLI considered only module migrations and could start an app without
durable infrastructure tables. Now it derives required system catalogs from the
enabled jobs and durable-event services, applies them in stable owner order, and
reports their status even when the app has no feature modules.

## Changed

Module loading resolves source, Node package, and Damat package locations into
explicit entry, model, and migration paths. `migrate:list` preserves resolved
package migration directories.

`migrate:up` selects the shared durability catalog when jobs or durable events
are enabled. Jobs and durable events then select their own catalogs in stable
shared, jobs, events order. All-status output includes those system migration
owners, including in applications that do not declare feature modules.

## Action required

Run `damat-orm migrate:up` after enabling durable jobs or events. Package mode
remains early alpha.

## Breaking

- None. Enabled durable services add their required migration catalogs.

## References

- Current behavior: [ORM CLI README](../../packages/orm/cli/README.md)
- Source: `packages/orm/cli/src/`
