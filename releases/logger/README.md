# @damatjs/logger — release notes

Change history for this package. For how it works **now**, read the
[package README](../../packages/core/logger/README.md) and its
[docs](../../packages/core/logger/docs/).

`@damatjs/logger` sits near the bottom of the build graph and has no runtime
dependencies, so it is rarely the package that changes. Its functional surface has
been stable since the `0.1.0` baseline; every published version after that is a
version-sync / maintenance bump that ships no change to the logger's own code.
Those rows are marked inline below with no link.

| Version | Summary                                                                                           | Upgrade notes         |
| ------- | ------------------------------------------------------------------------------------------------- | --------------------- |
| 1.0.3   | Pretty errors render one stack without a duplicate heading                                        | [1.0.3 →](./1.0.3.md) |
| 0.1.3   | Version-sync bump (cross-module links land in other packages); no change to the logger's own code | —                     |
| 0.1.2   | Version-sync bump (relation-by-table-name lands in the ORM packages); no logger change            | —                     |
| 0.1.1   | Maintenance — CI / test cleanup, version bump                                                     | —                     |
| 0.1.0   | First published minor release — the full logger, plus child-prefix routing reaching the formatter | [0.1.0 →](./0.1.0.md) |
| 0.0.10  | Pre-release — build fix (`tsc-alias` for `@/` path aliases), version bump                         | —                     |
| 0.0.9   | Pre-release — build fix (`tsc-alias` module resolution), version bump                             | —                     |
| 0.0.8   | Pre-release — CI build fix for nested packages, version bump                                      | —                     |
| 0.0.7   | Pre-release — build error fix, version sync                                                       | —                     |
| 0.0.6   | Pre-release — include `dist` in published package, `prepublishOnly` guard                         | —                     |
| 0.0.5   | Pre-release — build fixes                                                                         | —                     |
| 0.0.4   | Pre-release — build fixes                                                                         | —                     |
| 0.0.3   | Pre-release — build fixes                                                                         | —                     |
| 0.0.2   | First pre-alpha release                                                                           | —                     |
