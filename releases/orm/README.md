# @damatjs/orm — release notes

Change history for this package. For how it works **now**, read the
[package README](../../packages/orm/main/README.md) and its
[docs](../../packages/orm/main/docs/).

`@damatjs/orm` is an umbrella / meta-package: it carries no logic of its own and
re-exports the five `@damatjs/orm-*` sub-packages under one name and a set of
subpath exports. Its own surface — the five `export *` lines and the six
`exports` entries — has been identical since the package was created, so every
published version after the baseline is a pure dependency bump (it ships whatever
changed in the sub-packages it re-exports). Those rows are marked inline below
with no link.

| Version | Summary                                                                                                                                             | Upgrade notes         |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 0.1.3   | Dependency bump — re-exports the cross-module links work (`@damatjs/link`) landing in the ORM sub-packages; no change to the umbrella's own surface | —                     |
| 0.1.2   | Dependency bump — re-exports table-name `hasOne`/`belongsTo` relations; no umbrella surface change                                                  | —                     |
| 0.1.1   | Maintenance — CI / test cleanup, dependency bumps                                                                                                   | —                     |
| 0.1.0   | First published minor release — the full ORM behind one dependency and six subpath exports                                                          | [0.1.0 →](./0.1.0.md) |
| 0.0.10  | Pre-release — build fix (`tsc-alias` for `@/` path aliases), dependency bumps                                                                       | —                     |
| 0.0.9   | Pre-release — build fix (`tsc-alias` module resolution), dependency bumps                                                                           | —                     |
| 0.0.8   | Pre-release — CI build fix for nested packages, dependency bumps                                                                                    | —                     |
| 0.0.7   | Pre-release — build error fix, version sync, dependency bumps                                                                                       | —                     |
| 0.0.6   | Pre-release — include `dist` in published package, dependency bumps                                                                                 | —                     |
| 0.0.5   | Pre-release — build fixes, dependency bumps                                                                                                         | —                     |
| 0.0.4   | Pre-release — build fixes, dependency bumps                                                                                                         | —                     |
| 0.0.3   | Pre-release — build fixes, dependency bumps                                                                                                         | —                     |
| 0.0.2   | First pre-alpha release                                                                                                                             | —                     |
