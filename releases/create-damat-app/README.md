# @damatjs/create-damat-app — release notes

Change history for this package. For how it works **now**, read the
[package README](../../packages/cli/create-damat-app/README.md) and its
[docs](../../packages/cli/create-damat-app/docs/).

`create-damat-app` is the project scaffolder: it clones a starter repo, renames
and re-versions it, writes default env, installs with Bun, and (for projects)
starts the dev server. Most version bumps reach it only as dependency updates —
the framework/ORM features they carry (cross-module links, relation-by-table-name)
flow in through the starter repos and the `@damatjs/*` deps it pins, not through
the scaffolder's own code. Those are marked below as maintenance.

| Version | Summary | Upgrade notes |
|---------|---------|---------------|
| 0.1.3 | Maintenance / dependency bumps (carries `@damatjs/link` cross-module links via deps + starter) | — |
| 0.1.2 | Maintenance / dependency bumps (carries relation-by-table-name via deps) | — |
| 0.1.1 | Maintenance / CI + test cleanup | — |
| 0.1.0 | First stable minor: Bun-only scaffolder for projects and modules | [0.1.0 →](./0.1.0.md) |
| 0.0.10 | Maintenance / build fix (tsc-alias for `@/` aliases) | — |
| 0.0.9 | Maintenance / build fix (tsc-alias for `@/` aliases) | — |
| 0.0.8 | Maintenance / CI (build nested packages) | — |
| 0.0.7 | Maintenance / build fix | — |
| 0.0.6 | Maintenance / build fix (include `dist`, prepublish check) | — |
| 0.0.5 | Maintenance / build fix | — |
| 0.0.4 | Maintenance / build fix | — |
| 0.0.3 | Maintenance / build fix | — |
| 0.0.2 | First functional pre-alpha release | — |
