# @damatjs/orm-cli

> `damat-orm` — the standalone CLI for Damat ORM migrations and code generation.

`@damatjs/orm-cli` ships the `damat-orm` binary: a small, config-driven command
line tool that runs module migrations and generates TypeScript types from your
ORM model definitions. It reads `damat.config.ts` to discover modules, the
cross-module links under `links`, and the database URL, then delegates the real
work to the `@damatjs/orm-*` packages. It is built on the shared `@damatjs/cli`
runner, so commands, options, banner, and help formatting come from the same
framework as the rest of the Damat CLIs.

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

| Command                   | Description                                             | Example                         |
| ------------------------- | ------------------------------------------------------- | ------------------------------- |
| `migrate:up`              | Run all pending migrations across every module          | `damat-orm migrate:up`          |
| `migrate:status [module]` | Show applied/pending counts (optionally for one module) | `damat-orm migrate:status user` |
| `migrate:list`            | List modules that have migrations, with counts          | `damat-orm migrate:list`        |
| `migrate:create <module>` | Create an initial or diff migration for a module        | `damat-orm migrate:create user` |

> `migrate:status` also accepts `--module <name>` / `-m <name>` as an
> alternative to the positional argument.
>
> **Type generation lives elsewhere.** `damat-orm` is migrations-only — generate
> row types/zod/registry with `damat codegen <module>` (in an app) or
> `damat module codegen` (in a module package), both over `@damatjs/codegen`.

All migration commands honor a resolved module's declared migration directory,
including immutable packages whose SQL lives below `src/migrations`.

### Cross-module links

When `damat.config.ts` declares `links` (a path, or list of paths, e.g.
`"./src/links"`), each owner directory underneath it — `src/links/<owner>/` with
its own `models/`, `index.ts`, and `migrations/` — is discovered as a **link
migration module** with id `link:<owner>`. Link modules carry the junction
tables that join models living in different modules.

- `migrate:list` / `migrate:status` / `migrate:create` / `migrate:up` treat each
  `link:<owner>` like any other module, so its junction tables migrate through
  the same pipeline:

  ```bash
  bun damat-orm migrate:create link:user   # initial/diff migration for the junction tables
  bun damat-orm migrate:up                 # applies module + link migrations together
  ```

- `damat codegen` does **not** emit standalone types for a link module. Passing
  a `link:<owner>` id prints a notice and exits 0. Instead, running
  `damat codegen` for a **linked** module weaves the relationship in: for every
  link the module participates in, the linked entity is added as an optional
  field on the module's generated interface via a sibling `<table>.links.ts`
  declaration-merge file that is re-exported from the module's types index.

  ```bash
  # user and organization are linked → regenerate the linked modules
  bun damat codegen user           # Users gains e.g. organizations?: Organizations[]
  bun damat codegen organization   # Organizations gains the reverse field
  ```

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
  // optional: cross-module link directories (each owner becomes link:<owner>)
  links: "./src/links",
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
bun damat codegen user
```

Notes grounded in the source:

- The config file name is fixed to `damat.config.ts`. Source paths resolve
  relative to it; Node and Damat descriptors resolve immutable artifact roots
  and their manifest-declared migrations.
- The database URL is read from `projectConfig.databaseUrl`, falling back to
  `services.database` (`connectionString`, or host/port/user/password/database
  fields used to build one).
- `migrate:create` writes an **initial** migration the first time (no snapshot
  yet) and a **diff** migration thereafter; a diff with no changes is reported
  as "No changes detected." and exits 0.
- `damat codegen` (not `damat-orm`) writes a file-per-table map plus an `index.ts`
  into the module's `types/` directory; when the module participates in cross-module
  links it also emits `<table>.links.ts` augmentation files and re-exports them
  from `index.ts`.
- Link migration modules are discovered from `links` in `damat.config.ts`: each
  `src/links/<owner>` becomes a `link:<owner>` module whose junction tables
  migrate through `migrate:create` / `migrate:up`.

## How it fits

**Depends on**:

- `@damatjs/cli` — command runner, option parsing, banner, help, config loader.
- `@damatjs/orm-migration` — discovery, executor, generator, tracker
  (`runMigrations`, `createInitialMigration`, `createDiffMigration`,
  `getMigrationStatus`, `discoverModels`, `discoverAllMigrations`).
- `@damatjs/orm-processor` — `snapshotExist` (initial-vs-diff decision).
- `@damatjs/orm-model` — `toModuleSchema` (builds the schema for codegen).
- `@damatjs/codegen` — `generateFilesMap` (turns a schema into type files).
- `@damatjs/link` — `resolveLinkMigrationModules` (discovers `link:<owner>`
  migration modules) and `renderLinkAugmentations` (the `<table>.links.ts`
  files woven into linked modules' generated types).
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
