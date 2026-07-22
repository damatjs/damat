# @damatjs/cli-support Unreleased

> Build type-checking now resolves the compiler entirely from the target project.

## Fixed

- `runTypeCheck` invokes `bun run tsc --noEmit` from the project directory.
- Type-check output, exit status, skip mode, missing-`tsconfig` behavior, and the
  actionable missing-TypeScript error remain intact.
- The command no longer uses `bun x` or registry resolution.

## Release coordination

This is part of the six-package tooling chain: `@damatjs/orm-cli`,
`@damatjs/cli-support`, `@damatjs/cli-codegen`, `@damatjs/cli-app`,
`@damatjs/cli-module`, and `@damatjs/damat-cli`.

Together with the standalone-runtime work, the unpublished branch has a
nine-package version-bump union: those six plus `@damatjs/module`,
`@damatjs/framework`, and `@damatjs/services`. Do not publish from this change.
