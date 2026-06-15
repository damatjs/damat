# @damatjs/orm-cli

> `damat-orm` — the standalone CLI for Damat ORM migrations and code generation.

`@damatjs/orm-cli` ships the `damat-orm` binary: a small, config-driven command
line tool that runs module migrations and generates TypeScript types from your
ORM model definitions. It reads `damat.config.ts` to discover modules and the
database URL, then delegates the real work to the `@damatjs/orm-*` packages. It
is built on the shared `@damatjs/cli` runner, so commands, options, banner, and
help formatting come from the same framework as the rest of the Damat CLIs.

Part of the [Damat](../../../README.md) monorepo · [Full guide](../../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

The binary is `damat-orm`.

```bash
# inside the monorepo (workspace protocol)
bun add -d @damatjs/orm-cli@*

# globally, to get `damat-orm` on your PATH
bun add -g @damatjs/orm-cli
```

```bash
# typical invocation from a project root that has damat.config.ts
bun damat-orm <command> [args] [options]
# or, if installed globally
damat-orm <command> [args] [options]
```

## Commands

Two top-level command groups, each with subcommands. Running a group with no
subcommand prints the available subcommands.

| Command | Description | Example |
|---|---|---|
| `migrate:up` | Run all pending migrations across every module | `damat-orm migrate:up` |
| `migrate:status [module]` | Show applied/pending counts (optionally for one module) | `damat-orm migrate:status user` |
| `migrate:list` | List modules that have migrations, with counts | `damat-orm migrate:list` |
| `migrate:create <module>` | Create an initial or diff migration for a module | `damat-orm migrate:create user` |
| `generate:types <module>` | Generate row/type files from a module's models | `damat-orm generate:types user` |

> `migrate:status` also accepts `--module <name>` / `-m <name>` as an
> alternative to the positional argument.

## When to use

- **Use `damat-orm`** when you want to drive migrations and type generation
  directly — in CI, scripts, or a non-Damat-app project that still uses the
  Damat ORM and a `damat.config.ts`.
- **Inside a full Damat backend**, the `damat` CLI (`@damatjs/damat-cli`) is the
  day-to-day entry point; it shells out to `bun damat-orm migrate:up` after
  installing a module. Both read the same `damat.config.ts`.
- **For authoring a single standalone module package**, prefer
  `damat module migration:create` / `damat module codegen` (from
  `@damatjs/damat-cli`), which operate on the module package directly.

## Quick start

Given a project with a `damat.config.ts` like:

```ts
export default {
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
  },
  modules: {
    user: { id: "user", resolve: "./src/modules/user" },
  },
};
```

```bash
# 1. create the first migration for the user module (diffs models vs snapshot)
bun damat-orm migrate:create user

# 2. apply pending migrations for all modules
bun damat-orm migrate:up

# 3. check what is applied vs pending
bun damat-orm migrate:status
bun damat-orm migrate:status user      # or: --module user

# 4. list modules that have migrations
bun damat-orm migrate:list

# 5. generate TypeScript types from the user module's models
bun damat-orm generate:types user
```

Notes grounded in the source:

- The config file name is fixed to `damat.config.ts`; module `resolve` paths are
  resolved relative to the config file's directory and may be relative or
  absolute.
- The database URL is read from `projectConfig.databaseUrl`, falling back to
  `services.database` (`connectionString`, or host/port/user/password/database
  fields used to build one).
- `migrate:create` writes an **initial** migration the first time (no snapshot
  yet) and a **diff** migration thereafter; a diff with no changes is reported
  as "No changes detected." and exits 0.
- `generate:types` writes a file-per-table map plus an `index.ts` into the
  module's `types/` directory.

## How it fits

**Depends on**:

- `@damatjs/cli` — command runner, option parsing, banner, help, config loader.
- `@damatjs/orm-migration` — discovery, executor, generator, tracker
  (`runMigrations`, `createInitialMigration`, `createDiffMigration`,
  `getMigrationStatus`, `discoverModels`, `discoverAllMigrations`).
- `@damatjs/orm-processor` — `snapshotExist` (initial-vs-diff decision).
- `@damatjs/orm-model` — `toModuleSchema` (builds the schema for codegen).
- `@damatjs/orm-codegen` — `generateFilesMap` (turns a schema into type files).
- `@damatjs/orm-type` — `OrmModule` / `OrmModuleContainer` shapes.
- `@damatjs/deps` — bundled `pg` (`Pool`).
- `@damatjs/logger` — `ILogger` used by command output.

**Consumed by**: invoked directly by developers/CI, and shelled out to by
`@damatjs/damat-cli` (`damat module add` suggests `bun damat-orm migrate:up`).

## Documentation

- [Internals](./docs/README.md) — module map, command dispatch, config/path
  resolution, and per-command behaviour.
- [Full guide](../../../docs/GUIDE.md) — the Damat monorepo guide.

## License

MIT
