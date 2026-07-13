# @damatjs/orm-type — release notes

Change history for this package. For how it works **now**, read the
[package README](../../packages/orm/type/README.md) and its
[docs](../../packages/orm/type/docs/).

`@damatjs/orm-type` is the dependency-free type vocabulary for the Damat ORM —
it ships only types, no runtime code. Most published versions are pure
maintenance or dependency bumps (the type surface stayed identical); those rows
are marked inline below with no link.

| Version | Summary                                                                                                                                                                                    | Upgrade notes         |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| 0.1.3   | `OrmModule` gains an optional `kind?: "module" \| "link"` field so the toolchain can tell a cross-module link directory from an ordinary module (cross-module links work); dependency bump | [0.1.3 →](./0.1.3.md) |
| 0.1.2   | Dependency bump (`@damatjs/deps`) — picks up table-name `hasOne`/`belongsTo` relation work in higher packages; no change to this package's type surface                                    | —                     |
| 0.1.1   | Maintenance — CI and test cleanup, dependency bumps                                                                                                                                        | —                     |
| 0.1.0   | First published minor release — the shared ORM type vocabulary                                                                                                                             | [0.1.0 →](./0.1.0.md) |
| 0.0.10  | Pre-release — build fix (`tsc-alias` for `@/` path aliases), dependency bumps                                                                                                              | —                     |
| 0.0.9   | Pre-release — build fix (`tsc-alias` module resolution), dependency bumps                                                                                                                  | —                     |
| 0.0.8   | Pre-release — CI build fix for nested packages, dependency bumps                                                                                                                           | —                     |
| 0.0.7   | Pre-release — build error fix, version sync, dependency bumps                                                                                                                              | —                     |
| 0.0.6   | Pre-release — include `dist` in published package, dependency bumps                                                                                                                        | —                     |
| 0.0.5   | Pre-release — build fixes, dependency bumps                                                                                                                                                | —                     |
| 0.0.4   | Pre-release — build fixes, dependency bumps                                                                                                                                                | —                     |
| 0.0.3   | Pre-release — build fixes, dependency bumps                                                                                                                                                | —                     |
| 0.0.2   | First pre-alpha release                                                                                                                                                                    | —                     |
