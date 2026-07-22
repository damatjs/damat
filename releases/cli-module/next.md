# @damatjs/cli-module Unreleased

> `damat module dev` now owns capability preflight, port safety, readiness, and watcher shutdown.

## What changed

The command resolves environment and runtime capabilities before creating
`.damat` or a watcher. Fixed-port collisions return an actionable nonzero error
without a child process or database pool. Database-backed modules get database
creation before the child starts; the runtime then owns the single migration
pass. The watcher forwards SIGINT/SIGTERM.
It also supervises reloads itself, awaiting the old HTTP/workers/resource
shutdown before launching the next child.

Generated packages now use:

```json
{ "dev": "damat module dev" }
```

## Added

- Preflight validation for configured, environment, and CLI ports, including 0.
- Direct readiness output with actual URL, `/api` mount, and Ctrl-C guidance.

## Changed / improved

- Removed the generated `database:setup &&` duplication from `dev`.
- Service-only modules skip database creation.
- Hot reload no longer leaves duplicate active worker registrations.
- A real generated `bun run dev` subprocess regression now covers readiness,
  durable work, reload, collision preflight, Ctrl-C, and port reuse.
- Fresh scaffolds declare only their implemented `module` and `tests`
  capabilities; optional provider paths appear only when files exist.

## Breaking

- Existing generated package scripts are not rewritten automatically.
- This package requires a version bump before release.

## Action required

All five packages require version bumps; do not publish them in this change.
Release and upgrade `@damatjs/module`, `@damatjs/cli-module`,
`@damatjs/framework`, `@damatjs/damat-cli`, and `@damatjs/services` together.
Services is required for database-free empty-model scaffolds. Existing module
libraries must change `scripts.dev` to `damat module dev`; the Damat library's
142 manifests and its synchronization generator have been upgraded in source.

## References

- Current behavior: [CLI module README](../../packages/cli/module/README.md)
- Source: `packages/cli/module/src/commands/module/dev.ts`
