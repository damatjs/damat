# @damatjs/orm-migration — release notes

Change history for this package. For how it works **now**, read the
[package README](../../packages/orm/migration/README.md) and its
[docs](../../packages/orm/migration/docs/).

| Version       | Summary                                                                                                                                                                            | Upgrade notes         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Unreleased    | Explicit resolved package migration directories                                                                                                                                    | [next →](./next.md)   |
| 0.6.0         | Advisory-lock serialization of concurrent runs, non-transactional execution for `CONCURRENTLY`/`ADD VALUE` statements, status API keyed by module name                             | [0.6.0 →](./0.6.0.md) |
| 0.5.0         | Per-module discovery sorts numerically by timestamp (matches all-module discovery) — consistent migration order across entry points                                                | [0.5.0 →](./0.5.0.md) |
| 0.1.4 – 0.4.1 | Lockstep bumps — no change to this package's own behavior                                                                                                                          | —                     |
| 0.1.3         | Dependency bump for cross-module links (`@damatjs/link`). Link junction tables flow through this package's existing discover/generate/run pipeline unchanged — no code change here | —                     |
| 0.1.2         | Dependency bump. Table-name `hasOne`/`belongsTo` relations land in `@damatjs/orm-model` / `@damatjs/orm-processor`; this package's migration pipeline is untouched                 | —                     |
| 0.1.1         | Maintenance — CI and test cleanup, dependency bumps                                                                                                                                | —                     |
| 0.1.0         | First published minor release — the module-based migration runtime, stabilized                                                                                                     | [0.1.0 →](./0.1.0.md) |
| 0.0.10        | Pre-release — build fix (`tsc-alias` for `@/` path aliases), dependency bumps                                                                                                      | —                     |
| 0.0.9         | Pre-release — build fix (`tsc-alias` module resolution), dependency bumps                                                                                                          | —                     |
| 0.0.8         | Pre-release — CI build fix for nested packages, dependency bumps                                                                                                                   | —                     |
| 0.0.7         | Pre-release — build error fix, version sync, dependency bumps                                                                                                                      | —                     |
| 0.0.6         | Pre-release — include `dist` in published package, dependency bumps                                                                                                                | —                     |
| 0.0.5         | Pre-release — build fixes, dependency bumps                                                                                                                                        | —                     |
| 0.0.4         | Pre-release — build fixes, dependency bumps                                                                                                                                        | —                     |
| 0.0.3         | Pre-release — build fixes, dependency bumps                                                                                                                                        | —                     |
| 0.0.2         | First pre-alpha release                                                                                                                                                            | —                     |

</content>
</invoke>
