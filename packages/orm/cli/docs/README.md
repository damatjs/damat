# @damatjs/orm-cli — Internals

Maintainer-facing reference for the `damat-orm` CLI. Read alongside the
[package README](../README.md), which covers user-facing usage.

## Split docs

- [migrate-commands.md](./migrate-commands.md) — `migrate:up`, `migrate:status`,
  `migrate:list`, `migrate:create`.
- [generate-commands.md](./generate-commands.md) — the unregistered
  `generate:types` source and the public owner commands.
- [config-and-paths.md](./config-and-paths.md) — config, database, module, and
  system-migration loading plus the `resolve*Path` helpers.

## Module map

| File / dir                    | Responsibility                                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/bin.ts`                  | Executable entry (`#!/usr/bin/env bun`). Calls `runCli(...)` with name/version/commands, the `damat.config.ts` config loader, and a boxed banner       |
| `src/index.ts`                | Library entry — re-exports `runCli`, the `@damatjs/cli` command types, `loadModules`, `requireDatabaseUrl`                                             |
| `src/cli/index.ts`            | Re-exports `runCli` and `./types`                                                                                                                      |
| `src/cli/types.ts`            | `ModulesMap`, `OrmCliOptions`, `Logger`, and re-exported `Command`/`CommandContext`/`CommandResult`/`CommandOption` + `OrmModule`/`OrmModuleContainer` |
| `src/cli/registry.ts`         | A standalone in-memory `CommandRegistry` impl (`getRegistry`, `registerCommand`, `getCommand`, `getAllCommands`)                                       |
| `src/cli/commands/index.ts`   | Aggregates `database:setup` and the `migrate` command group                                                                                            |
| `src/cli/commands/migrate/*`  | The `migrate` group: `index.ts` (parent) + `up`, `status`, `list`, `create`                                                                            |
| `src/cli/commands/generate/*` | The `generate` group: `index.ts` (parent) + `types`                                                                                                    |
| `src/cli/config/index.ts`     | `requireDatabaseUrl(logger)` — reads `process.env.DATABASE_URL`, exits 1 if missing                                                                    |
| `src/cli/utils/load.ts`       | Barrel for module, database, and system-migration config loaders.                                                                                      |
| `src/cli/utils/load/`         | Fresh config import, module/link normalization, database URL loading, and built-in system catalog selection.                                           |
| `src/cli/utils/index.ts`      | Re-exports `./paths`                                                                                                                                   |
| `src/cli/utils/paths/*`       | `resolveModelsPath`, `resolveMigrationsPath`, `resolveTypesPath`, `resolvePaths`, `resolveBasePath`, `getModulesDir`, `DEFAULT_MODULES_DIR`            |
| `src/tests/*`                 | `bun:test` coverage of commands, config loading, paths, registry, migrate/generate structure                                                           |

## Architecture overview

`damat-orm` is a thin command layer over the shared `@damatjs/cli` runner and the
`@damatjs/orm-*` packages. The flow:

```
bin.ts
  └─ runCli({ name, version, commands: allCommands, configLoader, banner })
        │  (from @damatjs/cli — parses argv, resolves command/subcommand,
        │   coerces+validates options, prints banner/help, calls handler)
        ▼
   allCommands = [migrateCommand]
        │
        └─ migrateCommand.subcommands = [up, status, list, create]
              │
              ▼  each handler(ctx):
        loadModules("damat.config.ts", ctx.cwd)   ← from src/cli/utils/load.ts
        loadSystemMigrations(...)                 ← durability catalog selector
        loadDatabaseUrl(...) (for db-touching cmds)
        resolve*Path(moduleConfig.resolve)        ← from src/cli/utils/paths
              │
              ▼  dynamic import of the ORM package that does the work:
        @damatjs/orm-migration | @damatjs/orm-processor
        @damatjs/link          | @damatjs/deps/pg (Pool)
```

Every handler returns `{ exitCode: number }` and reports via `ctx.logger`
(`info`/`success`/`warn`/`error`/`skip`). `bin.ts` assigns that result to
`process.exitCode`; a logged command failure therefore cannot exit zero.

## Command dispatch

- `bin.ts` passes `commands: allCommands` to `runCli`. The runner (in
  `@damatjs/cli`) owns argv parsing, subcommand resolution, option
  coercion/validation, banner, and help. This package does not parse argv
  itself.
- Each `Command` has `name`, `description`, optional `options`/`subcommands`, and
  an async `handler(ctx) => { exitCode }`.
- A **parent** command (`migrate`) has no real work — its handler just lists
  subcommands. The dispatchable commands are the leaves (`migrate:up`,
  `migrate:create`, …). Note the leaf `name` values use the colon form
  (`migrate:up`), matching how users type them. The `generate` directory is not
  registered by this command list.

> `src/cli/registry.ts` is a self-contained `CommandRegistry` (map-backed,
> throws on duplicate names). It is exported for programmatic/embedding use but
> is **not** on the `bin.ts` runtime path — `runCli` does its own resolution
> from the `commands` array.

## Data flow & invariants

- **Config file is fixed**: migration handlers load modules and built-in system
  migrations from `damat.config.ts`; `bin.ts` uses the same file.
- **Module ids drive everything**: `loadModules` returns an `OrmModuleContainer`
  keyed by module id, each value `{ id, name, path, resolve }` with `resolve`
  always an absolute path. Per-module commands look up `modules[moduleName]` and
  error if absent.
- **Cache busting**: `loadModules`/`loadDatabaseUrl` bundle each config load to
  a unique module in the operating-system temporary directory, import it, then
  remove it. Every load gets fresh contents without writing beside the source,
  so migration jobs work from a read-only application filesystem.
- **Link modules**: `loadModules` also folds in cross-module link migration
  modules from `config.links` — one `link:<owner>` entry per `src/links/<owner>`
  directory, tagged `kind: "link"`. They share the `migrations/`+snapshot layout
  of real modules; `damat codegen` skips them and instead weaves their fields
  into the linked modules' types.
- **Pools are always closed**: db-touching handlers wrap work in
  `try { … } finally { await pool.end() }`.
- **Module-free durability is valid**: `up` and all-status run when enabled
  system migrations exist even if the module container is empty.
- **Pipeline catalog closure**: enabling pipelines selects shared durability,
  jobs, and pipeline catalogs even when `services.jobs` is absent; its internal
  executor still relies on fenced job storage.
- **Exit codes**: missing config / missing module / missing db URL / failed
  migration → `exitCode: 1`; success or "no changes" → `0`.

## Known mismatch to be aware of

`src/cli/types.ts` declares `ModulesMap = Record<string, { resolve: string }>`,
but `loadModules` in `src/cli/utils/load.ts` actually returns the richer
`OrmModuleContainer` (`{ id, name, path, resolve }` per entry, from
`@damatjs/orm-type`). The commands consume the richer shape; `ModulesMap` is a
simplified alias used at the `bin.ts` config-loader boundary. Keep this in mind
before tightening the types.

## Safe-extension guidance

- **Add a subcommand**: create `src/cli/commands/<group>/<name>.ts` exporting a
  `Command` (name in colon form, e.g. `migrate:foo`), then add it to the
  group's `index.ts` `subcommands` array.
- **Add a top-level group**: create `src/cli/commands/<group>/index.ts`, then add
  it to `allCommands` in `src/cli/commands/index.ts`.
- **Always**: load config via the shared module/database/system loaders, resolve paths via
  the `resolve*Path` helpers (never hand-join), `dynamic import()` the heavy ORM
  packages inside the handler (keeps startup fast), close any pool in `finally`,
  and return an explicit `exitCode`.
