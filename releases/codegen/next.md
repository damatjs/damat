# @damatjs/codegen — Unreleased

## Changed

- `generateFilesMap` now types its optional logger against the `debug` and
  `info` methods it actually uses. CLI runtimes can inject a neutral logger
  without implementing the full structured logger interface.

## Upgrade

No action is required. Existing `ILogger` values remain compatible.
