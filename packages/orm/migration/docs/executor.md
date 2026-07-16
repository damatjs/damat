# Executor

Source: [`src/executor/`](../src/executor)

## Responsibility

Apply pending migrations against a live database and report status. The executor is the only part of the package that runs SQL. It takes a `pg` `Pool` (created and owned by the caller), ensures the tracker table and DB prerequisites exist, then for each module computes the pending set and applies each file transactionally, recording results in `_damat_migration_logs`.

## `runMigrations` — orchestration

Source: [`run.ts`](../src/executor/run.ts)

```ts
export async function runMigrations(
  pool: Pool,
  moduleResolvers: OrmModuleContainer,
  options?: MigrationRunOptions,
): Promise<ModuleMigrationResult[]>;
```

Steps:

1. `const tracker = new MigrationTracker(pool); await tracker.ensureTable();` — create the log table/indexes if missing.
2. `await bootstrapDatabase(pool);` — install idempotent DB prerequisites (see below).
3. Run `options.systemMigrations` in global order through the same tracker.
4. Stop immediately if a system migration fails.
5. Run each module through `runModuleMigrations`.

System migrations contain inline SQL and are tracked by `(owner, id)`. Their
results precede module results. Calls without `systemMigrations` retain the
module-only result shape.

### `runModuleMigrations` (internal, per module)

1. `discoverModuleMigrations(module.resolve)` → all `.sql` files for the module.
2. `tracker.getApplied(module.name)` → applied rows; build a `Set` of applied names.
3. `pending = migrations.filter(m => !appliedNames.has(m.name))`; record `result.pending`.
4. If nothing pending → log `skip` and return success.
5. Otherwise apply each pending migration in order via `executeMigration`. On success, push to `result.applied`; on failure, set `result.success = false`, capture `result.error`, and **break** (stop applying further migrations for that module).
6. Any thrown error (e.g. discovery failure) is caught, sets `success: false`, and logged.

```ts
// src/types/migration.ts
interface ModuleMigrationResult {
  success: boolean;
  applied: string[];
  pending: string[];
  error?: Error;
}
```

> `runMigrations` keys off `module.name` for the tracker and `module.resolve` for discovery. There is no separate "active modules" allowlist parameter — the container _is_ the set of modules to run.

## `executeMigration` — one file, one transaction

Source: [`migration.ts`](../src/executor/migration.ts)

```ts
export async function executeMigration(
  pool: Pool,
  migration: MigrationInfo,
  moduleName: string,
  tracker: MigrationTracker,
): Promise<{ success: boolean; error?: Error }>;
```

1. `fs.readFileSync(migration.path, "utf-8")` — read the raw SQL.
2. `pool.connect()` → `BEGIN` → `client.query(sql)` (the whole file in one call) → `COMMIT`. On any error: `ROLLBACK`, rethrow; `client.release()` in `finally`.
3. On success: compute `execution_time_ms`, `tracker.recordApplied(moduleName, migration.name, executionTime)`, log a success line, return `{ success: true }`.
4. On failure: normalize to `Error`, log an error line, return `{ success: false, error }` (caller stops the module's run).

## `bootstrapDatabase` — prerequisites

Source: [`bootstrap.ts`](../src/executor/bootstrap.ts)

```ts
export async function bootstrapDatabase(pool: Pool): Promise<void>;
```

Runs `GENERATE_ID_SQL` once at the start of every `runMigrations`. It is idempotent:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION generate_id(prefix TEXT)
RETURNS TEXT LANGUAGE sql AS $$
  SELECT prefix || '_' || gen_random_uuid()::TEXT;
$$;
```

This makes a `generate_id('usr') → 'usr_<uuid>'` helper available to migration SQL and to default-value expressions. (The doc-comment describes a ULID-style id; the implementation uses `gen_random_uuid()`.)

## Status

Source: [`status.ts`](../src/executor/status.ts)

```ts
export async function getMigrationStatus(
  pool: Pool,
  moduleResolvers: OrmModuleContainer,
  options?: MigrationRunOptions,
): Promise<MigrationStatus>;
export async function getModuleMigrationStatus(
  pool: Pool,
  modulesResolver: string,
): Promise<{ module: ModuleMigrationStatus }>;
```

Both `ensureTable()` first. All-status calls prepend one entry for each system
owner, then report every module:

- `discoverModuleMigrations(resolver)` and `tracker.getApplied(resolver)`.
- Set each `MigrationInfo.applied` flag from the applied-name `Set`.
- Tally `applied`/`pending` counts into a `ModuleMigrationStatus`.

`getMigrationStatus` returns `{ modules: ModuleMigrationStatus[] }`. `getModuleMigrationStatus` returns a single `{ module }` and **throws** if the resolver has no migration files.

```ts
interface ModuleMigrationStatus {
  name: string;
  applied: number;
  pending: number;
  migrations: MigrationInfo[];
}
interface MigrationStatus {
  modules: ModuleMigrationStatus[];
}
```

> Module status uses `module.resolve` for discovery and `module.name` for the
> tracker key, matching `runMigrations`.

## Edge cases & gotchas

- **Whole-file execution.** The entire `.sql` is sent in one `client.query`. Statements that cannot run inside a transaction (e.g. `CREATE INDEX CONCURRENTLY`, some `ALTER TYPE ... ADD VALUE` forms) will fail under the surrounding `BEGIN`/`COMMIT`. Generated SQL avoids `CONCURRENTLY`; hand-written migrations needing it must be split out.
- **System failure is global.** A failed system migration prevents later system
  and module migrations. Module failures remain isolated to that module.
- **No down/revert path.** `runMigrations` only applies forward. `tracker.recordReverted` exists for callers that implement revert separately.
- **Caller owns the pool.** Nothing here calls `pool.end()`.

## Safe extension

- To add a revert command, pair `tracker.recordReverted` with executing a `down` section (the generated `.sql` template currently emits only `up` statements — you'd need to extend `getMigrationTemplateWithSQL` to embed reversible SQL).
- To add more bootstrap SQL, append idempotent statements to `bootstrap.ts`; it runs on every up.
- If you need dry-run, branch before `executeMigration` and just report `pending`.
