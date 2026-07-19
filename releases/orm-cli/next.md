# @damatjs/orm-cli Unreleased

> Makes the app CLI select and report durable system migrations automatically.

## What changed

Before, the CLI considered only module migrations and could start an app without
durable infrastructure tables. Now it derives required system catalogs from the
enabled jobs, durable-event, and pipeline services, applies them in stable owner order, and
reports their status even when the app has no feature modules.

The new `database:setup` command creates the configured PostgreSQL database when
it is absent and then applies all selected migrations. It connects through the
standard `postgres` database only after PostgreSQL reports `3D000`, quotes the
target identifier safely, tolerates concurrent creation, and closes target and
admin clients on every path.

The executable now propagates every command handler's exit code. Configuration,
connection, and migration failures no longer print an error and then exit zero.
The unreachable legacy `generate:types` implementation has been removed;
codegen remains owned by `damat codegen` and `@damatjs/module-generator`.
Configuration reloads now use bundled modules in the operating-system temporary
directory instead of files next to `damat.config.ts`, allowing migrations in
read-only production containers.

## Changed

Module loading resolves source, Node package, and Damat package locations into
explicit entry, model, and migration paths. `migrate:list` preserves resolved
package migration directories.

`migrate:up` selects the shared durability catalog when jobs or durable events
are enabled. Jobs and durable events then select their own catalogs in stable
shared, jobs, events order. All-status output includes those system migration
owners, including in applications that do not declare feature modules.
Pipelines select the jobs catalog as an internal dependency, followed by their
own definitions and runtime catalog.

## Action required

Run `damat-orm database:setup` for a fresh backend, or `migrate:up` when the
database already exists, after enabling durable jobs, events, or pipelines.
The configured role needs `CREATEDB` only for a missing target. Package mode
remains early alpha.

## Breaking

- None. Enabled durable services add their required migration catalogs.

## References

- Current behavior: [ORM CLI README](../../packages/orm/cli/README.md)
- Source: `packages/orm/cli/src/`
