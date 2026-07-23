# @damatjs/cli-app Unreleased

> `damat build` uses the application-local TypeScript compiler.

## Fixed

- The build type-check gate now runs `bun run tsc --noEmit` from the application
  directory through `@damatjs/cli-support`.
- `--no-typecheck`, inherited output, and nonzero build propagation are
  unchanged.
- Build, config-build, dev, and start now resolve `Bun.spawn` at invocation
  time, preventing test/import order from bypassing an installed launcher.
- A regression exercises every app process-launch path after replacing the
  runtime launcher.

## Release coordination

This is part of the six-package tooling chain: `@damatjs/orm-cli`,
`@damatjs/cli-support`, `@damatjs/cli-codegen`, `@damatjs/cli-app`,
`@damatjs/cli-module`, and `@damatjs/damat-cli`.

Together with the standalone-runtime work, the unpublished branch has a
nine-package version-bump union: those six plus `@damatjs/module`,
`@damatjs/framework`, and `@damatjs/services`. The consumer-audit fixes add
`@damatjs/cli` and `@damatjs/mcp`, making the union eleven. Do not publish from
this change.
