# @damatjs/orm-model — release notes

Change history for this package. For how it works **now**, read the
[package README](../../packages/orm/model/README.md) and its
[docs](../../packages/orm/model/docs/).

| Version       | Summary                                                                                                                                           | Upgrade notes         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 0.6.0         | `created_at`/`updated_at` become `timestamp with time zone` (were `date`); `updated_at` is `NOT NULL DEFAULT now()`                               | [0.6.0 →](./0.6.0.md) |
| 0.1.4 – 0.5.0 | Lockstep bumps — no change to this package's own schema output                                                                                    | —                     |
| 0.1.3         | Dependency bump (`@damatjs/orm-type`, `@damatjs/deps`) — picks up the cross-module links work in `@damatjs/link`; no change to this package's API | —                     |
| 0.1.2         | Relation targets can be a plain table-name string; FKs inferred by convention                                                                     | [0.1.2 →](./0.1.2.md) |
| 0.1.1         | Maintenance — CI and test cleanup, dependency bumps                                                                                               | —                     |
| 0.1.0         | First published minor release — the schema-definition DSL                                                                                         | [0.1.0 →](./0.1.0.md) |
| 0.0.10        | Pre-release — build fix (`tsc-alias` for `@/` path aliases), dependency bumps                                                                     | —                     |
| 0.0.9         | Pre-release — build fix (`tsc-alias` module resolution), dependency bumps                                                                         | —                     |
| 0.0.8         | Pre-release — CI build fix for nested packages, dependency bumps                                                                                  | —                     |
| 0.0.7         | Pre-release — build error fix, version sync, dependency bumps                                                                                     | —                     |
| 0.0.6         | Pre-release — include `dist` in published package, dependency bumps                                                                               | —                     |
| 0.0.5         | Pre-release — build fixes, dependency bumps                                                                                                       | —                     |
| 0.0.4         | Pre-release — build fixes, dependency bumps                                                                                                       | —                     |
| 0.0.3         | Pre-release — build fixes, dependency bumps                                                                                                       | —                     |
| 0.0.2         | First pre-alpha release                                                                                                                           | —                     |
