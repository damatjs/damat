# orm-processor internals

Maintainer-facing documentation for `@damatjs/orm-processor`. For the public overview and quick start, see the [package README](../README.md).

The processor is a **pure, stateless schema engine**. Given the serialized `ModuleSchema` shape (from `@damatjs/orm-type`), it answers three questions:

1. *What did the schema look like last time?* → **snapshot** (the only layer that touches disk).
2. *What changed between two versions?* → **diff** (emits an ordered list of `SchemaChange`).
3. *What SQL realizes those changes?* → **sqlGenerator** (emits PostgreSQL DDL strings).

## Module map

| File / dir | Responsibility |
| --- | --- |
| `src/index.ts` | Barrel: re-exports `types`, `diff`, `sqlGenerator`, `snapshot`. |
| `src/snapshot/index.ts` | `loadSnapshot`, `saveSnapshot`, `snapshotExist` — JSON read/write of `schema-snapshot.json`. The only file with I/O. → [snapshot.md](./snapshot.md) |
| `src/diff/` | Schema comparison. `diffSchemas.ts` is the entry point; `tables.ts`/`columns.ts`/`indexes.ts`/`foreignKeys.ts`/`enums.ts` are per-concern; `utils.ts` has equality checks; `priority.ts` defines ordering; `reverse.ts` inverts a diff. → [diff.md](./diff.md) |
| `src/sqlGenerator/` | DDL emission. `changeSql.ts` dispatches a `SchemaChange`; `tables.ts`/`columns.ts`/`indexes.ts`/`foreignKeys.ts`/`enums.ts` emit per-concern SQL; `utils.ts` quotes identifiers and builds column fragments; `generateMigration/` wraps it all into `generateFromDiff` / `generateFromSnapshot`. → [sql-generator.md](./sql-generator.md) |
| `src/types/diff/` | `schema.ts` (`SchemaDiff`), `changes.ts` (`SchemaChange` union), `generator.ts` (options & results). |

## Architecture overview

```
ModuleSchema (prev)  ModuleSchema (curr)
        \                 /
         \               /
       diffSchemas(prev, curr)        ── diff layer
              │
              ▼
        SchemaDiff { hasChanges, changes[], warnings[] }
          changes are priority-sorted
              │
              ▼
   generateFromDiff(diff, opts)        ── sqlGenerator layer
              │  (per change → generateChangeSQL → per-concern emitter)
              ▼
   GeneratedMigration { upStatements[], description, warnings[] }

ModuleSchema (single) ──► generateFromSnapshot(snapshot, opts) ──► GeneratedMigration
```

The snapshot layer sits **beside** this pipeline: callers `loadSnapshot` to get `prev`, build `curr` from models elsewhere, then `saveSnapshot(curr)` after a successful generation so the next run is incremental.

## Control / data flow

1. **Incremental path** (the common case, used by `createDiffMigration` in orm-migration):
   `loadSnapshot` → build current schema from models → `diffSchemas` → `generateFromDiff` → write `.sql` → `saveSnapshot`.
2. **Baseline path** (first migration, `createInitialMigration`):
   build current schema → `generateFromSnapshot` (no diff needed) → write `.sql` → `saveSnapshot`.

## Invariants & design decisions

- **Pure functions, no DB.** Every diff and SQL function is deterministic given its inputs. Only `snapshot/index.ts` performs I/O.
- **Priority ordering is the contract between layers.** Each `SchemaChange` carries a numeric `priority` (`diff/priority.ts`). `diffSchemas` sorts changes by it, so the SQL generator can emit statements in dependency order (enums → tables → columns → indexes → FKs → alters → drops in reverse) without re-reasoning about dependencies.
- **Snapshot is the source of truth for "previous".** The processor never reads the live database to decide what changed; it trusts the last-saved snapshot. This makes generation work offline and in CI.
- **Drops are destructive and one-way.** `reverseDiff` deliberately cannot reconstruct a dropped table/column/index/FK/enum (the original definition is gone); reversibility relies on keeping the previous snapshot.
- **Changed indexes and FKs are drop+re-add**, never altered in place (PostgreSQL has no `ALTER INDEX`/`ALTER CONSTRAINT` for these). See `diff/indexes.ts`, `diff/foreignKeys.ts`.
- **`safeMode` defaults to `true`** — emits `IF EXISTS` / `IF NOT EXISTS` guards (and a `DO $$` block for enums, which lack `CREATE TYPE IF NOT EXISTS`).
- **Identifiers are always double-quoted** and schema-qualified (`"schema"."table"`); embedded quotes are escaped.

## Split docs

- [snapshot.md](./snapshot.md) — persistence layer, file format, baseline behavior.
- [diff.md](./diff.md) — comparison algorithm, the `SchemaChange` union, priority, equality checks, reverse diff.
- [sql-generator.md](./sql-generator.md) — dispatch, per-concern emitters, options, generate-from-diff vs generate-from-snapshot.
