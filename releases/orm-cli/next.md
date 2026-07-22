# @damatjs/orm-cli Unreleased

> Config loading preserves `pg-cloudflare` as an optional PostgreSQL transport.

## Fixed

- `damat.config.ts` bundling externalizes `pg-cloudflare`, matching production
  config builds.
- Migrations and application codegen no longer force consumers to declare that
  optional transitive dependency of `pg`.
- Config caching, read-only source handling, and bundle error reporting remain
  unchanged.

## Release coordination

This is part of the six-package tooling chain: `@damatjs/orm-cli`,
`@damatjs/cli-support`, `@damatjs/cli-codegen`, `@damatjs/cli-app`,
`@damatjs/cli-module`, and `@damatjs/damat-cli`.

Together with the standalone-runtime work, the unpublished branch has a
nine-package version-bump union: those six plus `@damatjs/module`,
`@damatjs/framework`, and `@damatjs/services`. Do not publish from this change.
