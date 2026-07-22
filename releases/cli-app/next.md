# @damatjs/cli-app Unreleased

> `damat build` uses the application-local TypeScript compiler.

## Fixed

- The build type-check gate now runs `bun run tsc --noEmit` from the application
  directory through `@damatjs/cli-support`.
- `--no-typecheck`, inherited output, and nonzero build propagation are
  unchanged.

## Release coordination

This is part of the six-package tooling chain: `@damatjs/orm-cli`,
`@damatjs/cli-support`, `@damatjs/cli-codegen`, `@damatjs/cli-app`,
`@damatjs/cli-module`, and `@damatjs/damat-cli`.

Together with the standalone-runtime work, the unpublished branch has a
nine-package version-bump union: those six plus `@damatjs/module`,
`@damatjs/framework`, and `@damatjs/services`. Do not publish from this change.
