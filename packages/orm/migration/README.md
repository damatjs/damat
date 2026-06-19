# @damatjs/orm-migration

> Module-based PostgreSQL migration system: discover, generate, run, and track.

`@damatjs/orm-migration` is the migration runtime for the Damat ORM. Each application module owns its own `migrations/` folder of timestamped `.sql` files; this package discovers those files, generates new ones from your models (via [`@damatjs/orm-processor`](../processor/README.md)), runs pending migrations transactionally against a `pg` pool, and records what has been applied in a `_damat_migration_logs` table. It sits between the pure schema engine (processor) and the database, and is driven by the ORM CLI and the framework's module system.

Part of the [Damat](../../../README.md) monorepo · [Full guide](../../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

```bash
bun add @damatjs/orm-migration
```

Inside this monorepo it is referenced as a workspace dependency with `"@damatjs/orm-migration": "*"`.

## When to use

Use this package to:

- Generate a migration for a module from its current models (`createMigration` / `createInitialMigration` / `createDiffMigration`).
- Discover the migration files declared by one or more modules (`discoverModuleMigrations`, `discoverAllMigrations`).
- Apply pending migrations transactionally (`runMigrations`).
- Report which migrations are applied vs pending (`getMigrationStatus`, `getModuleMigrationStatus`).
- Inspect or maintain the migration log table directly (`MigrationTracker`).

Do **not** use it to:

- Compute diffs or emit SQL — that is [`@damatjs/orm-processor`](../processor/README.md) (this package re-uses it).
- Define models — that is [`@damatjs/orm-model`](../model/README.md).
- Open or pool connections — you pass an already-created `pg` `Pool` in.

## Quick start

```ts
import { Pool } from "@damatjs/deps/pg";
import {
  createMigration,
  runMigrations,
  getMigrationStatus,
} from "@damatjs/orm-migration";

// 1. Generate a migration for the "user" module.
//    Initial run → baseline; subsequent runs → diff vs the saved snapshot.
//    The second argument is the module's own directory (its resolver), which
//    is import()ed for its `models` export.
await createMigration("user", "src/modules/user");

// 2. Apply pending migrations. Pass a pg Pool and a module container.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const results = await runMigrations(pool, {
  user: { id: "user", name: "user", path: "src/modules/user", resolve: "src/modules/user" },
});
results.forEach((r) => console.log(r.success, r.applied));

// 3. Check status (per module resolver path).
const status = await getMigrationStatus(pool, ["src/modules/user"]);
console.log(status.modules);
```

## API

| Export | Kind | Summary |
| --- | --- | --- |
| `createMigration(moduleName, modulesDir?, opts?)` | function | Auto-picks initial vs diff based on whether a snapshot exists; returns a path or `DiffMigrationResult`. |
| `createInitialMigration(moduleName, moduleResolver, opts?)` | function | Baseline migration: full `CREATE` SQL from all models, saves first snapshot. Returns the file path. |
| `createDiffMigration(moduleName, moduleResolver, opts?)` | function | Diff migration vs the saved snapshot; returns `DiffMigrationResult` (may be `filePath: null`). |
| `discoverModuleMigrations(moduleResolver)` | function | Scan `<resolver>/migrations/` for `Migration*.sql`; returns sorted `MigrationInfo[]`. |
| `discoverAllMigrations(resolvers[])` | function | Discover across resolvers, sorted by timestamp. |
| `discoverModels(moduleResolver, logger?)` | function | `import()` a module and return its `ModelDefinition[]` (throws if none). |
| `runMigrations(pool, moduleContainer)` | function | Ensure tracker table, bootstrap DB, run pending per module, transactional. Returns `ModuleMigrationResult[]`. |
| `getMigrationStatus(pool, resolvers[])` | function | Applied/pending counts + `MigrationInfo[]` per module. |
| `getModuleMigrationStatus(pool, resolver)` | function | Same, for one module (throws if it has no migrations). |
| `MigrationTracker` | class | CRUD over `_damat_migration_logs` (`ensureTable`, `getApplied`, `recordApplied`, `recordReverted`). |
| `bootstrapDatabase(pool)` | function | Idempotent DB setup: `pgcrypto` + `generate_id(prefix)` function. |
| `log`, `separator`, `successBanner`, `errorBanner` | functions | Migration logging helpers (re-exported from `@damatjs/logger`). |
| `MigrationTracker`, `AppliedMigration` | class / type | The tracker and its applied-row type. |

`MigrationInfo`, `ModuleMigrationResult`, `ModuleMigrationStatus`, `MigrationStatus`, and `DatabaseConfig` are internal types: they describe the shapes returned by the functions above (so you get them through inference) but are not re-exported as named types from the package root. `executeMigration` is likewise internal — `runMigrations` is the entry point for applying migrations.

**Subpath exports:** none — everything is under `.`.

## How it fits

**Depends on:**

- [`@damatjs/orm-processor`](../processor/README.md) — `diffSchemas`, `generateFromDiff`/`generateFromSnapshot`, `loadSnapshot`/`saveSnapshot`, `snapshotExist`, and the `*MigrationOptions`/`DiffMigrationResult` types.
- [`@damatjs/orm-model`](../model/README.md) — `toModuleSchema`, `ModelDefinition`.
- `@damatjs/orm-type` — `OrmModule`/`OrmModuleContainer` (the module-resolver shape) and `Pool` typing via `@damatjs/deps/pg`.
- `@damatjs/logger` — colored, structured migration output.
- `@damatjs/deps` (pg), `@damatjs/types`.

**Depended on by (in-repo):** `@damatjs/orm-cli`, `@damatjs/orm-main`, `@damatjs/module`.

## Documentation

- [Internals & module map](./docs/README.md)
- [Discovery](./docs/discovery.md) · [Executor](./docs/executor.md) · [Generator](./docs/generator.md) · [Tracker](./docs/tracker.md)
- [Damat full guide](../../../docs/GUIDE.md)

## License

MIT
