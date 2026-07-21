# @damatjs/types — release notes

Change history for this package. For how it works **now**, read the
[package README](../../packages/core/types/README.md) and its
[docs](../../packages/core/types/docs/).

`@damatjs/types` is the zero-dependency package at the bottom of the build graph:
the `AppError` hierarchy plus the legacy `initFramework` no-op. Its source
(`src/index.ts`) has been stable since the 0.1.0 baseline — every later 0.1.x bump
is a version-sync with the rest of the monorepo and does not change this package's
own code or behavior.

| Version | Summary                                                                                              | Upgrade notes         |
| ------- | ---------------------------------------------------------------------------------------------------- | --------------------- |
| 0.1.3   | Version sync with the cross-module links release (`@damatjs/link`); no change to this package's code | —                     |
| 0.1.2   | Version sync with relation-by-table-name work in the ORM; no change to this package's code           | —                     |
| 0.1.1   | Maintenance — CI/test cleanup, version bump                                                          | —                     |
| 0.1.0   | First published minor release — the `AppError` HTTP-error hierarchy + `initFramework`                | [0.1.0 →](./0.1.0.md) |
| 0.0.10  | Pre-release — build fix (`tsc-alias` for `@/` path aliases), version bump                            | —                     |
| 0.0.9   | Pre-release — build fix (`tsc-alias` module resolution), version bump                                | —                     |
| 0.0.8   | Pre-release — CI build fix for nested packages, version bump                                         | —                     |
| 0.0.7   | Pre-release — build error fix, version sync                                                          | —                     |
| 0.0.6   | Pre-release — include `dist` in published package, `prepublishOnly` check                            | —                     |
| 0.0.5   | Pre-release — build fixes                                                                            | —                     |
| 0.0.4   | Pre-release — build fixes                                                                            | —                     |
| 0.0.3   | Pre-release — build fixes                                                                            | —                     |
| 0.0.2   | First pre-alpha release                                                                              | —                     |
