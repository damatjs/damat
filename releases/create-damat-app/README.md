# @damatjs/create-damat-app — release notes

Change history for this package. For how it works **now**, read the
[package README](../../packages/cli/create-damat-app/README.md) and its
[docs](../../packages/cli/create-damat-app/docs/).

`create-damat-app` is the project/module scaffolder. For an **app** it clones a
starter repo, renames and re-versions it, writes default env, installs with Bun, and
starts the dev server. For a **module** (`--module`) it scaffolds locally via
`damat module init` (or clones a custom `--repo-url`). Many version bumps reach it
only as dependency updates — framework/ORM features (cross-module links,
relation-by-table-name) flow in through the starter repos and the pinned
`@damatjs/*` deps, not the scaffolder's own code — and are marked below as
maintenance.

| Version       | Summary                                                                                                                                                                            | Upgrade notes         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 0.6.0         | Git/shell commands run via `execFile` with argument arrays (no shell-string interpolation); build-time version embedding                                                           | [0.6.0 →](./0.6.0.md) |
| 0.2.0 – 0.5.0 | Lockstep bumps — no change to the scaffolder's own behavior                                                                                                                        | —                     |
| 0.1.4         | `--module` scaffolds locally via `damat module init` (was: clone a remote starter); `--repo-url` clones a custom starter; `create-damat-app <name>` works without typing `create`. | [0.1.4 →](./0.1.4.md) |
| 0.1.3         | Maintenance / dependency bumps (carries `@damatjs/link` cross-module links via deps + starter)                                                                                     | —                     |
| 0.1.2         | Maintenance / dependency bumps (carries relation-by-table-name via deps)                                                                                                           | —                     |
| 0.1.1         | Maintenance / CI + test cleanup                                                                                                                                                    | —                     |
| 0.1.0         | First stable minor: Bun-only scaffolder for projects and modules                                                                                                                   | [0.1.0 →](./0.1.0.md) |
| 0.0.10        | Maintenance / build fix (tsc-alias for `@/` aliases)                                                                                                                               | —                     |
| 0.0.9         | Maintenance / build fix (tsc-alias for `@/` aliases)                                                                                                                               | —                     |
| 0.0.8         | Maintenance / CI (build nested packages)                                                                                                                                           | —                     |
| 0.0.7         | Maintenance / build fix                                                                                                                                                            | —                     |
| 0.0.6         | Maintenance / build fix (include `dist`, prepublish check)                                                                                                                         | —                     |
| 0.0.5         | Maintenance / build fix                                                                                                                                                            | —                     |
| 0.0.4         | Maintenance / build fix                                                                                                                                                            | —                     |
| 0.0.3         | Maintenance / build fix                                                                                                                                                            | —                     |
| 0.0.2         | First functional pre-alpha release                                                                                                                                                 | —                     |
