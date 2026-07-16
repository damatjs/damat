# @damatjs/codegen — Unreleased

## Changed

- `generateFilesMap` now types its optional logger against the `debug` and
  `info` methods it actually uses. CLI runtimes can inject a neutral logger
  without implementing the full structured logger interface.
- `runModuleCodegen` accepts a `serviceImport` override for app-owned generation
  from immutable package modules.
- `moduleTypeImport` derives a registry service type from a resolved module's
  default entry without requiring a named service export.

## Upgrade

No action is required. Existing `ILogger` values remain compatible.
