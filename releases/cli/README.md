# @damatjs/cli — release notes

Change history for this package. For how it works **now**, read the
[package README](../../packages/core/cli/README.md) and its
[docs](../../packages/core/cli/docs/).

`@damatjs/cli` is the general CLI **framework** (declarative command registry,
option parsing/validation, help, banners) that the user-facing `@damatjs/damat-cli`
and `@damatjs/orm-cli` are built on — it is not the `damat` command itself.

| Version    | Summary                                                                                                                                         | Upgrade notes             |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Unreleased | Framework-neutral runtime injection, invocation-local state, returned results, and opt-in presentation.                                         | [Unreleased →](./next.md) |
| 0.3.6      | `parseCommandArgs` understands `--no-<flag>` to negate a boolean option on subcommands, matching top-level (cac) parsing.                       | [0.3.6 →](./0.3.6.md)     |
| 0.1.4      | Adds `defaultCommand` to the framework — a CLI can run its primary command without the user typing its name (powers `create-damat-app <name>`). | [0.1.4 →](./0.1.4.md)     |
| 0.1.3      | Version sync with the cross-module links release; no framework API change (only `package.json`/changelog touched).                              | —                         |
| 0.1.2      | Version sync with the relation-by-table-name ORM release; no framework API change.                                                              | —                         |
| 0.1.1      | CI / test cleanup.                                                                                                                              | —                         |
| 0.1.0      | First minor release: the stabilized declarative CLI framework — `runCli`, the command registry, option validation/coercion, help, and banners.  | [0.1.0 →](./0.1.0.md)     |
| 0.0.10     | Maintenance: tsc-alias for `@/` path resolution in published builds; optional inherited package config.                                         | —                         |
| 0.0.9      | Maintenance: tsc-alias for `@/` path resolution in published packages.                                                                          | —                         |
| 0.0.8      | Maintenance: CI builds nested packages; `prepublishOnly` check kept.                                                                            | —                         |
| 0.0.7      | Maintenance: build-error fix; version sync.                                                                                                     | —                         |
| 0.0.6      | Maintenance: include `dist` in published package; add `prepublishOnly` guard.                                                                   | —                         |
| 0.0.5      | Maintenance: build fixes.                                                                                                                       | —                         |
| 0.0.4      | Maintenance: build fixes.                                                                                                                       | —                         |
| 0.0.3      | Maintenance: build fixes.                                                                                                                       | —                         |
| 0.0.2      | First published pre-alpha: core CLI functional end-to-end (not production-ready).                                                               | —                         |
