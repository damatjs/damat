# @damatjs/orm-processor

> Schema processing for the Damat ORM: snapshot, diff, and SQL generation.

`@damatjs/orm-processor` is the low-level engine that turns schema definitions into migrations. It persists a module's schema as a JSON **snapshot**, **diffs** two snapshots into an ordered list of structural changes, and **generates** PostgreSQL DDL from either a diff (incremental migration) or a single snapshot (baseline migration). It has no database connection and no model-builder API of its own — it operates purely on the serialized `ModuleSchema` shape from [`@damatjs/orm-type`](../type/README.md). It is consumed by [`@damatjs/orm-migration`](../migration/README.md) and the ORM CLI to compute and write `.sql` migration files.

Part of the [Damat](../../../README.md) monorepo · [Full guide](../../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

```bash
bun add @damatjs/orm-processor
```

Inside this monorepo it is referenced as a workspace dependency with `"@damatjs/orm-processor": "*"`.

## When to use

Use this package when you need to:

- Persist and reload a module's schema as a JSON snapshot (`saveSnapshot` / `loadSnapshot`).
- Compute the structural difference between two schemas (`diffSchemas.diffSchemas`).
- Generate PostgreSQL `up` SQL from a diff (`generateMigration.generateFromDiff`) or from a full snapshot (`generateMigration.generateFromSnapshot`).
- Build a migration tool or CLI on top of the ORM.

Do **not** use it directly to:

- Define models or columns — that is [`@damatjs/orm-model`](../model/README.md).
- Execute migrations, discover migration files, or track applied migrations — that is [`@damatjs/orm-migration`](../migration/README.md).
- Open a database connection or run queries — this package never touches a database.

## Quick start

```ts
import {
  diffSchemas,
  generateMigration,
  loadSnapshot,
  saveSnapshot,
} from "@damatjs/orm-processor";
import type { ModuleSchema } from "@damatjs/orm-type";

const migrationsDir = "src/modules/store/migrations";

// 1. Load the last persisted schema (empty baseline if none exists yet)
const previous = loadSnapshot(migrationsDir, "store");

// 2. The current schema, built elsewhere from your models
const current: ModuleSchema = {
  moduleName: "store",
  schema: "public",
  tables: [
    {
      name: "product",
      columns: [
        { name: "id", type: "uuid", nullable: false, primaryKey: true },
        { name: "title", type: "character varying", length: 200, nullable: false },
      ],
    },
  ],
  enums: [],
};

// 3. Diff and generate UP SQL
const diff = diffSchemas.diffSchemas(previous, current);
if (diff.hasChanges) {
  const migration = generateMigration.generateFromDiff(diff);
  console.log(migration.description);    // e.g. "1 table created"
  console.log(migration.upStatements);   // ['CREATE TABLE IF NOT EXISTS "public"."product" ( ... )']

  // 4. Persist the new state so the next diff is incremental
  saveSnapshot(migrationsDir, current);
}
```

## API

The root export (`.`) re-exports the type definitions, the `diff`, `sqlGenerator`, and `snapshot` modules. Many sub-modules are exposed under **namespaces** (e.g. `diffSchemas`, `generateMigration`); the table notes the call site.

| Export | Kind | Summary |
| --- | --- | --- |
| `loadSnapshot(dir, moduleName)` | function | Read `schema-snapshot.json` from a migrations dir; returns an empty baseline `ModuleSchema` if absent. |
| `saveSnapshot(dir, schema)` | function | Write a `ModuleSchema` to `schema-snapshot.json` (creates the dir if needed). |
| `snapshotExist(dir)` | function | `true` if `schema-snapshot.json` exists in `dir`. |
| `diffSchemas.diffSchemas(prev, curr)` | function | Compare two `ModuleSchema`s → priority-sorted `SchemaDiff`. Primary diff entry point. |
| `reverseDiff.reverseDiff(diff)` | function | Invert a forward diff for `down` migrations (drops are intentionally skipped). |
| `tablesDiff`, `columnsDiff`, `indexesDiff`, `foreignKeysDiff`, `enumsDiff`, `utilsDiff`, `priorityDiff` | namespaces | Per-concern diff helpers and equality checks. |
| `generateMigration.generateFromDiff(diff, opts?)` | function | Emit ordered `up` SQL from a `SchemaDiff`. |
| `generateMigration.generateFromSnapshot(snapshot, opts?)` | function | Emit a full baseline `up` migration from a single `ModuleSchema`. |
| `changeSqlGenerator.generateChangeSQL(change, opts)` | function | Dispatch one `SchemaChange` to its SQL generator. |
| `changeSqlGenerator.generateDescription(diff)` | function | Human-readable summary string of a diff. |
| `tablesSqlGenerator`, `columnsSqlGenerator`, `indexesSqlGenerator`, `foreignKeysSqlGenerator`, `enumsSqlGenerator`, `utilsSqlGenerator` | namespaces | Per-concern SQL emitters and identifier helpers. |
| `SchemaDiff`, `SchemaChange` | types | The diff result and the union of all change records. |
| `MigrationGeneratorOptions`, `GeneratedMigration` | types | SQL-generation options and output. |
| `CreateDiffMigrationOptions`, `DiffMigrationResult` | types | Shapes consumed by the migration package's diff workflow. |

**Subpath exports:** none — everything is under `.`.

**Key types from `@damatjs/orm-type`:** `ColumnSchema`, `TableSchema`, `ModuleSchema`, `EnumSchema`, `IndexSchema`, `ForeignKeySchema`, `ColumnType`. This package's `SchemaChange` records embed them, but it does **not** re-export them — import these directly from `@damatjs/orm-type`.

## How it fits

**Depends on:**

- `@damatjs/orm-type` — `ModuleSchema`, `TableSchema`, `ColumnSchema`, etc. (the schema vocabulary).
- `@damatjs/orm-model`, `@damatjs/types`, `@damatjs/deps` — shared workspace deps.

It performs **no I/O except snapshot file read/write** (Node `fs`/`path`) and never connects to a database.

**Depended on by (in-repo):**

- [`@damatjs/orm-migration`](../migration/README.md) — calls `diffSchemas`, `generateFromDiff`/`generateFromSnapshot`, `loadSnapshot`/`saveSnapshot`.
- `@damatjs/orm-pg`, `@damatjs/orm-cli`, `@damatjs/orm-main`, `@damatjs/link`.

## Documentation

- [Internals & module map](./docs/README.md)
- [Snapshot layer](./docs/snapshot.md) · [Diff engine](./docs/diff.md) · [SQL generator](./docs/sql-generator.md)
- [Damat full guide](../../../docs/GUIDE.md)

## License

MIT
