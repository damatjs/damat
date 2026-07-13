# Tracker

Source: [`src/tracker/index.ts`](../src/tracker/index.ts)

## Responsibility

Own the `_damat_migration_logs` table — the single source of truth for which migrations have been applied (or reverted) for each module. The `MigrationTracker` class is the only code that reads or writes this table; the executor and status layers go through it.

## `_damat_migration_logs` schema

Created idempotently by `ensureTable()`:

```sql
CREATE TABLE IF NOT EXISTS "_damat_migration_logs" (
  "id"                TEXT        PRIMARY KEY,           -- "<module>_<name>"
  "module"            TEXT        NOT NULL,
  "name"              TEXT        NOT NULL,              -- migration file name (no .sql)
  "applied_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "reverted_at"       TIMESTAMPTZ,
  "execution_time_ms" INTEGER,
  "status"            TEXT        NOT NULL DEFAULT 'applied',  -- 'applied' | 'reverted'
  UNIQUE ("module", "name")
);
CREATE INDEX IF NOT EXISTS "idx__damat_migration_logs_module" ON "_damat_migration_logs" ("module");
CREATE INDEX IF NOT EXISTS "idx__damat_migration_logs_status" ON "_damat_migration_logs" ("status");
```

### Why per-module

The `module` column plus the `UNIQUE (module, name)` constraint is what makes tracking **per module**:

- "Which migrations are applied for module X?" is `WHERE module = X AND status = 'applied'`.
- Two different modules may both have a migration named `Migration..._Initial` without collision — the synthetic primary key `id = "<module>_<name>"` and the composite unique key keep them distinct.
- The `idx_..._module` and `idx_..._status` indexes back the hot-path filters used during `runMigrations` and status reporting.

## Class API

```ts
const tracker = new MigrationTracker(pool);
```

### `ensureTable(): Promise<void>`

Runs the `CREATE TABLE IF NOT EXISTS` + index DDL above. Safe to call repeatedly; both the executor and the status functions call it before any query.

### `getApplied(moduleName?): Promise<AppliedMigration[]>`

```ts
interface AppliedMigration {
  module: string;
  name: string;
  applied_at: Date;
}
```

Returns rows with `status = 'applied'`, ordered by `applied_at` ascending. With a `moduleName`, filters to that module (`WHERE status = 'applied' AND module = $1`); without it, returns applied migrations across **all** modules. The executor turns the result into a `Set` of `name`s to compute the pending set.

### `recordApplied(module, name, executionTimeMs): Promise<void>`

Upsert keyed on `id = "<module>_<name>"`:

```sql
INSERT INTO "_damat_migration_logs" (id, module, name, execution_time_ms, status)
VALUES ($1, $2, $3, $4, 'applied')
ON CONFLICT (id) DO UPDATE SET
  applied_at        = NOW(),
  reverted_at       = NULL,
  execution_time_ms = $4,
  status            = 'applied';
```

Re-applying a previously reverted migration flips `status` back to `'applied'`, clears `reverted_at`, and refreshes `applied_at` and the timing.

### `recordReverted(module, name): Promise<void>`

```sql
UPDATE "_damat_migration_logs"
SET reverted_at = NOW(), status = 'reverted'
WHERE id = $1;     -- id = "<module>_<name>"
```

Marks a migration reverted. Note: the migration runner (`runMigrations`) never calls this — it is provided for a caller-implemented revert flow.

## Edge cases & gotchas

- **`id` is `"<module>_<name>"`.** A module name containing an underscore plus a migration name could in principle collide with another module/name pair; in practice names are `Migration<14-digit>_<Label>`, so collisions are unlikely but not structurally impossible.
- **`getApplied` ordering is by `applied_at`, not by migration timestamp.** For the pending computation only membership matters, but if you rely on order, sort by `name` instead.
- **`recordReverted` is a no-op for unknown ids.** If `id` doesn't exist, the `UPDATE` affects zero rows silently.
- **Table name is a private constant** (`TABLE_NAME = "_damat_migration_logs"`); the class also stores `this.tableName` but always uses the same value.
- **No connection management.** The tracker uses `pool.query` directly (no explicit transaction); each call is autocommitted.

## Safe extension

- To add columns (e.g. a checksum to detect edited migration files), extend the `ensureTable` DDL and the `recordApplied` insert/upsert; consider an `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for existing deployments rather than relying solely on `CREATE TABLE IF NOT EXISTS`.
- To support history/audit, query by `status = 'reverted'` and `reverted_at`.
- Keep all `_damat_migration_logs` access inside this class so the schema has a single owner.
