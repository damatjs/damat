# @damatjs/services — next

## Fixed

- `ModuleService({ models: {} })` can initialize without `PoolManager`, allowing
  credentials-only and integration modules to run in database-free standalone
  development. Model-backed services retain the startup guard.

## Release

- The standalone runtime requires the coordinated five-package set:
  `@damatjs/module`, `@damatjs/cli-module`, `@damatjs/framework`,
  `@damatjs/damat-cli`, and `@damatjs/services`. This package is a required
  member, not an incidental supporting bump.
- The current unpublished branch also includes `@damatjs/orm-cli`,
  `@damatjs/cli-support`, `@damatjs/cli-codegen`, and `@damatjs/cli-app`. With
  the two overlapping CLI packages, the version-bump union is nine. Do not
  publish any member from this change.
