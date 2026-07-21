# Migrate commands

`database:setup` lives beside the migrate group. It loads the same configured
URL, connects to the target, and on PostgreSQL `3D000` checks/creates that
database through the standard `postgres` database. It then calls `migrate:up`,
so database creation and all selected system/module migrations form one setup
command. Every target/admin client is closed in `finally` paths.

The `migrate` group lives in `src/cli/commands/migrate/`. The parent
`migrate` command (`index.ts`) only lists its subcommands; the real work is in
the four leaves. All four call `loadModules("damat.config.ts", ctx.cwd)` and bail
with `exitCode: 1` if the config is missing. `migrate:list` and
`migrate:create` require modules. `migrate:up` and `migrate:status` can instead
operate on selected system migrations when the module map is empty.

`loadModules` returns ordinary modules **and** cross-module link migration
modules (one `link:<owner>` per `src/links/<owner>` directory declared under
`config.links`, each tagged `kind: "link"`). The four migrate commands make no
distinction: a `link:<owner>` entry has its own `migrations/` folder and snapshot
and flows through discovery, status, listing, and execution exactly like a
regular module.

```
migrate (parent, lists subcommands)
├─ migrate:up      → runMigrations(pool, modules, { systemMigrations })
├─ migrate:status  → getMigrationStatus / getModuleMigrationStatus
├─ migrate:list    → discoverAllMigrations
└─ migrate:create  → createInitialMigration | createDiffMigration
```

## `migrate:up` — `src/cli/commands/migrate/up.ts`

Run all pending migrations across every module.

Behaviour:

1. Load modules and enabled built-in system migrations; error only when both
   sets are empty.
2. `loadDatabaseUrl("damat.config.ts", ctx.cwd)` → `{ databaseUrl }`; error if
   empty/falsy.
3. `const pool = new Pool({ connectionString: databaseUrl })` (from
   `@damatjs/deps/pg`).
4. `runMigrations(pool, modules, { systemMigrations })` (from
   `@damatjs/orm-migration`).
5. `hasFailures = results.some(r => !r.success)` → logs failure/success
   accordingly.
6. `finally { await pool.end() }`.

Exit code: `1` if any result failed (or config/db errors), else `0`.

```bash
bun damat-orm migrate:up
```

## `migrate:status` — `src/cli/commands/migrate/status.ts`

Show applied vs pending counts. Options: `--module <name>` / `-m <name>`; a
positional `module` arg is also accepted (`ctx.options.module || ctx.args[0]`).

Behaviour:

1. Load modules and enabled system migrations; error only when both sets are
   empty, then load the database URL.
2. Open a `Pool`.
3. **Scoped** (a module name was given): look up `modules[moduleName]` (error if
   absent), then `getModuleMigrationStatus(pool, moduleConfig)`. The full
   descriptor preserves both the migration discovery path and tracker name. Logs
   `"<name>: <applied> applied, <pending> pending"` (level `success` when
   `pending === 0`, else `info`), then each migration (`success` if applied).
4. **All modules** (no name): call `getMigrationStatus(pool, modules, {
systemMigrations })`; system-owner entries appear before module entries.
5. `finally { await pool.end() }`.

```bash
bun damat-orm migrate:status            # all modules
bun damat-orm migrate:status user       # one module (positional)
bun damat-orm migrate:status --module user
```

## `migrate:list` — `src/cli/commands/migrate/list.ts`

List modules that have migrations, with a count each. Does **not** touch the
database.

Behaviour:

1. Load modules; error if empty.
2. `discoverAllMigrations(Object.values(modules).map(m => m.resolve))` (from
   `@damatjs/orm-migration`).
3. Tally per `m.name` into a `Map<string, number>`.
4. If empty → `logger.skip("No modules with migrations found.")`; otherwise log
   each, sorted: `"<module> (<n> migration[s])"`.

```bash
bun damat-orm migrate:list
```

## `migrate:create <module>` — `src/cli/commands/migrate/create.ts`

Create a migration for one module. Requires the module name as `ctx.args[0]`
(error if missing). Does **not** open a database connection — it diffs models
against the on-disk snapshot.

Behaviour:

1. Load modules; error if empty; look up `modules[moduleName]` (error if absent).
2. `resolvedMigrationsDir = resolveMigrationsPath(moduleConfig.resolve)`
   (= `<resolve>/migrations`).
3. `isInitial = !snapshotExist(resolvedMigrationsDir)` (from
   `@damatjs/orm-processor`).
4. **Initial** (`isInitial`): `createInitialMigration(moduleName,
moduleConfig.resolve)` → logs the created file path.
5. **Diff** (snapshot exists): `createDiffMigration(moduleName,
moduleConfig.resolve)`:
   - `result.hasChanges === false` → `logger.skip("No changes detected.")`,
     return `0`.
   - else → log the file path and any `result.warnings`.
6. Any thrown error → `logger.error(message)`, return `1`.

```bash
bun damat-orm migrate:create user       # first run: initial migration
bun damat-orm migrate:create user       # later runs: diff migration
bun damat-orm migrate:create link:user  # junction tables for the user owner's links
```

## Gotchas

- **Module name resolution** uses the keys of the container returned by
  `loadModules` (i.e. the module `id`, which defaults to the config key when no
  explicit `id` is set). Passing a name that is not a key yields
  `Module '<name>' not found in config`. Link migration modules are keyed by
  `link:<owner>`, so `migrate:create link:<owner>` / `migrate:status link:<owner>`
  target them directly.
- **Link modules never clobber real ones**: if a `link:<owner>` id collides with
  an existing module key, the real module wins and the link entry is dropped.
- **`migrate:create` never connects to the DB** — it only reads models +
  snapshot. A snapshot is the marker that flips initial → diff.
- **`migrate:up`/`migrate:status` always `pool.end()`** in `finally`; if you add
  a new db command, keep that pattern to avoid leaking connections in CI.
- The heavy ORM packages are loaded with `await import(...)` inside each handler,
  not at module top level — preserve that for fast CLI startup.
- `loadSystemMigrations` selects the shared durability catalog when
  `services.jobs` or `services.events.durable` is enabled. Jobs additionally
  selects `@damatjs/jobs`; durable events select `@damatjs/events`. The stable
  combined order is shared durability, jobs, then events. Catalog collection
  sorts by migration order, owner, and ID, so both `migrate:up` and the
  all-owner `migrate:status` view receive the same deterministic sequence.
