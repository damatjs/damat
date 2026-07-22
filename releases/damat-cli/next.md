# @damatjs/damat-cli Unreleased

> The composed `damat` executable includes the capability-aware standalone module development command.

## What changed

The executable composes the updated `@damatjs/cli-module`: `damat module dev`
now fails occupied ports before watcher/database startup, performs one
capability-aware migration path, prints unconditional readiness, reports port 0,
and forwards shutdown signals.
Reloads are serialized through graceful child shutdown rather than Bun's hard
process restart, so worker registrations do not accumulate.

## Changed / improved

- New module scaffolds use `"dev": "damat module dev"`.
- Standalone durable definitions execute locally with PostgreSQL defaults.
- The composed CLI test suite now runs the exact generated `bun run dev` command
  against isolated PostgreSQL and verifies the full process lifecycle.

## Breaking

- This composed package requires a version bump with its CLI-module dependency.

## Action required

All five packages require version bumps; do not publish them in this change.
Release and upgrade `@damatjs/module`, `@damatjs/cli-module`,
`@damatjs/framework`, `@damatjs/damat-cli`, and `@damatjs/services` together.
Services is required for fresh database-free empty-model modules. Update
consumer `scripts.dev` entries manually; the Damat library's 142 module
packages and generator have been migrated in its source repository.

## References

- Current behavior: [CLI module README](../../packages/cli/module/README.md)
- Source: `packages/cli/damat/`, `packages/cli/module/`
