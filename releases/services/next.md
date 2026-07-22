# @damatjs/services — next

## Fixed

- `ModuleService({ models: {} })` can initialize without `PoolManager`, allowing
  credentials-only and integration modules to run in database-free standalone
  development. Model-backed services retain the startup guard.

## Release

- All five packages require version bumps; do not publish them in this change.
  This is a required member of the coordinated release, not an incidental
  supporting bump. Release `@damatjs/module`, `@damatjs/cli-module`,
  `@damatjs/framework`, `@damatjs/damat-cli`, and `@damatjs/services` together.
  Do not publish any member from this change.
