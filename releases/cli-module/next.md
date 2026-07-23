# @damatjs/cli-module Unreleased

> `damat module dev` now owns capability preflight, port safety, readiness, and watcher shutdown.

## What changed

The command resolves environment and runtime capabilities before creating
`.damat` or a watcher. Fixed-port collisions return an actionable nonzero error
without a child process or database pool. Database-backed modules get database
creation before the child starts; the runtime then owns the single migration
pass. Parent-only SIGINT/SIGTERM is forwarded after a bounded acknowledgement
window. When a terminal already signals the parent and child process group, the
child acknowledgement suppresses duplicate forwarding during worker cleanup.
It also supervises reloads itself, awaiting the old HTTP/workers/resource
shutdown before launching the next child.

`damat module build` now invokes the module project's installed compiler with
`bun run tsc --noEmit`, avoiding `bun x` and registry resolution.

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
- A controlling-PTY regression writes an actual Ctrl-C and verifies child exit,
  worker stop timestamps, and immediate port reuse.
- Global verbose state reaches handled startup, migration, codegen, validation,
  installation, and build failures in module commands.
- Fresh scaffolds declare only their implemented `module` and `tests`
  capabilities; optional provider paths appear only when files exist.
- Module build preserves validation, skip flags, inherited output, and exit
  status while selecting the project-local TypeScript compiler.

## Breaking

- Existing generated package scripts are not rewritten automatically.
- This package requires a version bump before release.

## Action required

The standalone runtime remains a coordinated five-package set:
`@damatjs/module`, `@damatjs/cli-module`, `@damatjs/framework`,
`@damatjs/damat-cli`, and `@damatjs/services`. The local-compiler/config-loader
tooling change is a six-package chain: `@damatjs/orm-cli`,
`@damatjs/cli-support`, `@damatjs/cli-codegen`, `@damatjs/cli-app`,
`@damatjs/cli-module`, and `@damatjs/damat-cli`.

Those overlapping sets form a nine-package union. The consumer-audit fixes
add `@damatjs/cli` and `@damatjs/mcp`, producing an eleven-package version-bump
union. Do not publish any member from this change. Services is required for
database-free empty-model scaffolds. Existing module libraries must change `scripts.dev` to
`damat module dev`; the Damat library's 142 manifests and its synchronization
generator have been upgraded in source.

## References

- Current behavior: [CLI module README](../../packages/cli/module/README.md)
- Source: `packages/cli/module/src/commands/module/dev.ts`
