# SQL generator

Source: [`src/sqlGenerator/`](../src/sqlGenerator) · Options/result types: [`src/types/diff/generator.ts`](../src/types/diff/generator.ts)

## Responsibility

Turn abstract `SchemaChange` records (or a whole `ModuleSchema`) into PostgreSQL DDL strings. This layer is dialect-specific (PostgreSQL) and never reorders changes — it trusts the priority ordering established by the diff layer.

## Options & result

```ts
// src/types/diff/generator.ts
interface MigrationGeneratorOptions {
  cascadeDrops?: boolean; // add CASCADE to DROP statements (default false)
  safeMode?: boolean; // emit IF EXISTS / IF NOT EXISTS guards (default true)
  schema?: string; // target PostgreSQL schema (default "public")
}

interface GeneratedMigration {
  upStatements: string[]; // ordered UP statements (no trailing ';')
  description: string; // human-readable summary
  warnings: string[]; // carried through from the diff
}
```

Both top-level generators resolve options against `{ cascadeDrops: false, safeMode: true, schema: "public" }`.

## Two entry points — `sqlGenerator/generateMigration/`

### `generateFromDiff(diff, options?)`

```ts
// generateFromDiff.ts
export function generateFromDiff(
  diff: SchemaDiff,
  options?: MigrationGeneratorOptions,
): GeneratedMigration;
```

Iterates `diff.changes` (already priority-sorted) and concatenates `generateChangeSQL(change, opts)` for each. `description` comes from `generateDescription(diff)`; `warnings` are passed through from the diff. Use this for **incremental** migrations.

### `generateFromSnapshot(snapshot, options?)`

```ts
// generateFromSnapshot.ts
export function generateFromSnapshot(
  snapshot: ModuleSchema,
  options?: MigrationGeneratorOptions,
): GeneratedMigration;
```

Builds a **baseline** migration that creates the whole schema from scratch, with no diff:

1. If `options.schema` is unset but `snapshot.schema` is set, adopt the snapshot's schema.
2. Synthesize `SchemaChange[]`: a `create_enum` per enum, then per table a `create_table` plus an `add_index` per index and an `add_foreign_key` per FK — each with its `PRIORITY` constant.
3. Sort by priority and run each through `generateChangeSQL`.
4. `description` is `Baseline migration for module "<name>" (<n> table(s))`.

This is why `create_table` does **not** inline indexes/FKs: both the diff path and the snapshot path emit them as separate, individually-prioritized changes.

## Dispatch — `sqlGenerator/changeSql.ts`

```ts
export function generateChangeSQL(
  change: SchemaChange,
  options: MigrationGeneratorOptions,
): string[];
export function generateDescription(diff: SchemaDiff): string;
```

`generateChangeSQL` is an exhaustive `switch` over `change.type` that delegates to a per-concern emitter and always returns an array (most emitters return one statement; `alter_column` and `alter_enum` may return several). `generateDescription` tallies change types into a sentence like `"1 table created, 3 columns added, 1 enum altered"` (or `"No changes"`).

## Identifier & column helpers — `sqlGenerator/utils.ts`

- `quoteIdentifier(name)` → `"name"`, doubling any embedded `"`.
- `qualifiedTable(table, schema)` → `"schema"."table"`.
- `resolveSchema(options, tableSchema?)` → `options.schema ?? tableSchema ?? "public"`.
- `columnTypeSql(col)` — builds the SQL type fragment: named enums reference the quoted enum type (`"my_enum"` / `"my_enum"[]`); `character`/`character varying` append `(length)`; `numeric`/`decimal` become `NUMERIC`, `NUMERIC(p)`, or `NUMERIC(p, s)`; everything else uppercases the type name; arrays get a `[]` suffix.
- `columnDefinitionSql(col, skipPrimaryKey?)` — full inline definition: `"name" TYPE [PRIMARY KEY | NULL/NOT NULL] [UNIQUE] [DEFAULT <expr>]`. Single-column PKs are inlined as `PRIMARY KEY`; pass `skipPrimaryKey = true` for composite PKs (the table emitter adds a separate `CONSTRAINT ... PRIMARY KEY (...)`).

## Per-concern emitters

### Tables — `sqlGenerator/tables.ts`

- `generateCreateTable(change, opts) → TableSqlResult` — emits `CREATE TABLE[ IF NOT EXISTS] "schema"."name" ( ...col defs... )`. Computes PK columns: single PK is inlined per column; composite PK adds `CONSTRAINT "<table>_pkey" PRIMARY KEY (...)` and passes `skipPrimaryKey` to each column. `TableSqlResult.foreignKeyStatements` is always empty (FKs are emitted as separate `add_foreign_key` changes); the field exists only so the result shape stays uniform.
- `generateDropTable(change, opts)` — `DROP TABLE[ IF EXISTS] "schema"."name"[ CASCADE]` (cascade if `change.cascade` or `opts.cascadeDrops`).
- `generateRenameTable(change, opts)` — `ALTER TABLE ... RENAME TO ...`.
- `generateTableSql(table, opts)` — thin wrapper that calls `generateCreateTable` from a raw `TableSchema` (no change context).

### Columns — `sqlGenerator/columns.ts`

- `generateAddColumn` — `ALTER TABLE ... ADD COLUMN <columnDefinitionSql>`.
- `generateDropColumn` — `ALTER TABLE ... DROP COLUMN[ IF EXISTS] "col"[ CASCADE]`.
- `generateAlterColumn` → **`string[]`** — one statement per attribute, because PostgreSQL requires them separately:
  - `type` → `ALTER COLUMN "c" TYPE NEWTYPE USING "c"::NEWTYPE`.
  - `length` _without_ a `type` change → `ALTER COLUMN "c" TYPE VARCHAR(len)`.
  - `nullable` → `DROP NOT NULL` (→ nullable) or `SET NOT NULL`.
  - `default` → `SET DEFAULT <expr>` or `DROP DEFAULT`.
  - `unique` → `ADD UNIQUE ("c")` when set true; dropping a unique constraint emits a **`--` comment placeholder** because the constraint name isn't known here.
- `generateRenameColumn` — `ALTER TABLE ... RENAME COLUMN "from" TO "to"`.

### Indexes — `sqlGenerator/indexes.ts`

- `generateCreateIndex(index, tableName, schema, opts)` — `CREATE[ UNIQUE] INDEX[ IF NOT EXISTS] "name" ON "schema"."table"[ USING <method>] (cols)[ WHERE <pred>]`. Falls back to a derived name if `index.name` is absent; per-column `order` (`ASC`/`DESC`) is appended; `type` other than `btree` becomes `USING GIN`/`GIST`/etc.
- `generateAddIndex(change, opts)` — resolves schema and delegates to `generateCreateIndex`.
- `generateDropIndex(change, opts)` — `DROP INDEX[ IF EXISTS] "schema"."indexName"` (indexes are schema-qualified, not table-qualified).

### Foreign keys — `sqlGenerator/foreignKeys.ts`

- `generateAddForeignKey(fk, tableName, schema)` — `ALTER TABLE ... ADD CONSTRAINT "name" FOREIGN KEY (cols) REFERENCES "refTable" (refCols)` then optional `ON DELETE`, `ON UPDATE`, `DEFERRABLE[ INITIALLY DEFERRED]`, `MATCH FULL`. Note `fk.columns` are `ForeignKeyType` objects (uses `.name`); `referencedColumns` are plain strings.
- `generateAddForeignKeyFromChange(change, opts)` / `generateDropForeignKey(change, opts)` — change-based wrappers; drop emits `... DROP CONSTRAINT[ IF EXISTS] "name"`.

### Enums — `sqlGenerator/enums.ts`

- `generateCreateEnum(change, opts)` — values are single-quoted and `'`-escaped. With `safeMode` (default), wraps in a `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '<name>') THEN CREATE TYPE ... AS ENUM (...); END IF; END $$` block, because PostgreSQL has no `CREATE TYPE IF NOT EXISTS`. Without safeMode, a bare `CREATE TYPE ... AS ENUM (...)`.
- `generateDropEnum(change, opts)` — `DROP TYPE[ IF EXISTS] "schema"."name"[ CASCADE]`.
- `generateAlterEnum(change, opts)` → **`string[]`** — one `ALTER TYPE ... ADD VALUE IF NOT EXISTS '<v>'` per added value; removed values produce only an explanatory `--` comment (removal requires recreating the type).

## Gotchas

- **Statements have no trailing semicolons.** The migration-file template in `@damatjs/orm-migration` appends `;` and joins with blank lines.
- **`alter_column` unique-drop and `alter_enum` value-removal emit `--` comment placeholders**, not executable SQL — they require human follow-up. The diff layer already raised a warning for enum value removal.
- **Enum `schema` precedence differs from tables:** enum emitters use `enumDef.schema ?? options.schema ?? "public"` (and drop/alter use `options.schema ?? "public"`), whereas table/column emitters use `resolveSchema` (`options.schema ?? tableSchema ?? "public"`).
- **`safeMode` is on unless explicitly `false`** (`opts.safeMode !== false`), so any object lacking the key is treated as safe.

## Safe extension

- Adding a change kind requires a new `case` in `changeSql.ts`; the exhaustive switch over the `SchemaChange` union means TypeScript will error until you handle it.
- Keep emitters pure and string-returning; never execute SQL here.
- If you add a new column attribute, thread it through `columnDefinitionSql`/`columnTypeSql` (for create/add paths) **and** `generateAlterColumn` (for the alter path).
- To target another dialect, fork the emitter set behind an options flag — the diff layer and `generateChangeSQL` dispatch are dialect-agnostic and can be reused.
