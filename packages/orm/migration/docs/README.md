# orm-migration internals

Maintainer-facing documentation for `@damatjs/orm-migration`. For the public overview and quick start, see the [package README](../README.md).

This package coordinates module-owned SQL files and ordered inline system
migrations. Both use one advisory lock and the shared `_damat_migration_logs`
table.

## Module map

| File / dir       | Responsibility                                                                                                                                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`   | Barrel: re-exports discovery, executor, system, generator, tracker, and logger helpers.                                                                                                                                                      |
| `src/discovery/` | Find migrations from roots/resolved descriptors and models from aggregate providers or individual model files. → [discovery.md](./discovery.md)                                                                                              |
| `src/executor/`  | Apply migrations. `run.ts` (`runMigrations`) orchestrates; `migration.ts` (`executeMigration`) runs one file in a transaction; `bootstrap.ts` installs DB prerequisites; `status.ts` reports applied/pending. → [executor.md](./executor.md) |
| `src/system/`    | Execute inline system SQL before modules and report status by migration owner.                                                                                                                                                               |
| `src/generator/` | Create new migration files. `index.ts` picks initial vs diff; `initialMigration.ts` builds a baseline; `diffMigration.ts` computes diffs and `writeDiffMigration.ts` writes SQL + snapshot. → [generator.md](./generator.md)                 |
| `src/tracker/`   | `MigrationTracker` class: owns the `_damat_migration_logs` table. → [tracker.md](./tracker.md)                                                                                                                                               |
| `src/logger/`    | `log(level, msg, details?)` wrapper over `@damatjs/logger`; re-exports `separator`/`successBanner`/`errorBanner`.                                                                                                                            |
| `src/utils/`     | `template.ts` (`getMigrationTemplateWithSQL` — renders the `.sql` file body) and `timestamp.ts` (`generateTimestamp` → `YYYYMMDDHHMMSS`).                                                                                                    |
| `src/types/`     | `migration.ts` (`MigrationInfo`, `ModuleMigrationResult`, `ModuleMigrationStatus`, `MigrationStatus`) and `config.ts` (`DatabaseConfig`).                                                                                                    |

## The module-resolver model

Migrations are addressed through module **resolvers** rather than a single flat folder. The shape comes from `@damatjs/orm-type`:

```ts
interface OrmModule {
  id: string;
  name: string;
  path: string;
  resolve: string;
}
interface OrmModuleContainer {
  [key: string]: OrmModule;
}
```

- `name` — the module name; used as the `module` key in the log table.
- `resolve` — the artifact root used by editable-source tooling.
- `entry` / `models` / `migrations` — optional absolute paths produced by
  module resolution. Migration execution prefers `migrations`, so immutable
  packages run SQL without copying it into app source.

Migration discovery accepts either a bare resolver string or a resolved
descriptor carrying an explicit migrations directory.

## Migration file convention

```
<module>/migrations/Migration<YYYYMMDDHHMMSS>_<Label>.sql
```

Example: `Migration20260316103000_Initial.sql`. The leading `Migration` + 14-digit timestamp is mandatory — discovery filters on the `Migration` prefix and `.sql` suffix and parses the timestamp from the filename. The snapshot (`schema-snapshot.json`, owned by the processor) lives in the same folder.

## Per-module migration tracking and `_damat_migration_logs`

A single table, `_damat_migration_logs`, records every applied migration keyed by `(module, name)`:

| Column              | Type        | Meaning                              |
| ------------------- | ----------- | ------------------------------------ |
| `id`                | TEXT PK     | `"<module>_<name>"`                  |
| `module`            | TEXT        | Module name                          |
| `name`              | TEXT        | Migration file name (without `.sql`) |
| `applied_at`        | TIMESTAMPTZ | When applied (default `NOW()`)       |
| `reverted_at`       | TIMESTAMPTZ | When reverted, if ever               |
| `execution_time_ms` | INTEGER     | Apply duration                       |
| `status`            | TEXT        | `'applied'` or `'reverted'`          |

A `UNIQUE (module, name)` constraint plus indexes on `module` and `status` back the per-module queries. Because rows carry `module`, "applied for module X" is just `WHERE module = X AND status = 'applied'`, and two modules can independently own a migration named e.g. `Migration..._Initial`. See [tracker.md](./tracker.md).

## Control / data flow

**Generate** (`createMigration`):

```
snapshotExist(dir)? ─no→ createInitialMigration ─┐
                    └yes→ createDiffMigration ────┤
                                                  ▼
  discoverModels(resolver) → toModuleSchema()  (orm-model)
  initial:  generateFromSnapshot(schema)       (orm-processor) → write .sql + saveSnapshot
  diff:     loadSnapshot → diffSchemas → generateFromDiff → write .sql + saveSnapshot
```

**Run** (`runMigrations`):

```
new MigrationTracker(pool).ensureTable()
bootstrapDatabase(pool)              // pgcrypto + generate_id()
for each pending system migration in global order:
  BEGIN → inline SQL → tracker.recordApplied(owner, id, client) → COMMIT
  stop every later migration on failure
for each module in container:
  discoverModuleMigrations(resolve)
  tracker.getApplied(name) → diff against discovered → pending[]
  for each pending: executeMigration() in a transaction → tracker.recordApplied()
                    (stop on first failure)
```

## Invariants & design decisions

- **You bring the pool.** This package never creates a connection; `runMigrations`, status, and the tracker all take a `pg` `Pool`. Lifecycle is the caller's job.
- **Each migration runs in its own transaction.** `executeMigration` wraps the file in `BEGIN`/`COMMIT` and `ROLLBACK`s on any error. Multiple statements are sent in one `client.query(sql)` call.
- **System tracking is atomic.** Inline SQL and its tracker row use the same
  checked-out client and commit together.
- **System failures stop the run.** No later system or module migration runs.
- **Stop-on-first-failure per module.** Within a module, a failed migration aborts the remaining pending ones; the result records the error.
- **Applied-set is name-based per module.** Pending = discovered files whose name isn't in `getApplied(module)`. Renaming an applied `.sql` file makes it look pending again.
- **Bootstrap is idempotent** (`CREATE EXTENSION IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`) and runs on every `runMigrations`.
- **Generation is offline.** Creating migrations never touches the database — it compares models against the on-disk snapshot.
- **Down/revert is not wired into the runner.** `MigrationTracker.recordReverted` and the processor's `reverseDiff` exist, but `runMigrations` only applies forward. Reverts must be driven by a caller (e.g. the CLI).

## Split docs

- [discovery.md](./discovery.md) — file/model discovery, `MigrationInfo`, naming/sorting.
- [executor.md](./executor.md) — `runMigrations`, `executeMigration`, transactions, bootstrap, status.
- [generator.md](./generator.md) — `createMigration` and the initial/diff builders, templating, snapshots.
- [tracker.md](./tracker.md) — `MigrationTracker`, the `_damat_migration_logs` schema, applied/reverted records.
