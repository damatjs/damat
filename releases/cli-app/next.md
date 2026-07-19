# @damatjs/cli-app Unreleased

> Extracts application lifecycle commands into an independently composable
> capability.

## What changed

`create`, `clone`, `dev`, `start`, and `build` no longer belong to the Damat
executable package. They are exported with a stable command order from
`@damatjs/cli-app` and can run in any CLI built on `@damatjs/cli`.

Configuration remains optional. A command reads a Damat config only when its
operation requires one.

The `build` command source is explicitly tracked even though its directory name
matches the repository's build-output ignore. Clean checkouts now expose the
same command surface that local development and package tests use.

New applications include a receiver `damat.json` with accepted capability
targets for modules, routes, workflows, jobs, events, pipelines, links, tests,
migrations, models, and types. The receiver file is optional at install time.

Backend creation now collects a complete PostgreSQL URL or individual host,
port, user, hidden password, and database fields. After scaffolding it installs,
creates the selected database when absent, and runs the shared durability,
jobs, durable-event, and pipeline migrations. Generated apps enable those
workers in all mode and run the idempotent database setup before development.
Their README and completion output describe the same database-first bootstrap,
PostgreSQL/Redis responsibility split, and full module CLI invocation.

## Breaking

- Fresh scaffolds enable durable jobs, events, and pipelines by default and
  therefore require PostgreSQL. Use `--no-database-setup` to defer provisioning.

## Action required

Custom CLIs can add `appCliCapability` to their capability list.
Existing scaffolds can add `db:setup: damat-orm database:setup` and use it before
their first runtime start.

## References

- Current behavior: [package README](../../packages/cli/app/README.md)
- Source: `packages/cli/app/src/`
