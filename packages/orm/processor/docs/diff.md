# Diff engine

Source: [`src/diff/`](../src/diff) · Types: [`src/types/diff/`](../src/types/diff)

## Responsibility

Compare two `ModuleSchema`s (`previous` from the snapshot, `current` built from models) and produce a `SchemaDiff`: a flat, **priority-sorted** list of `SchemaChange` records plus non-fatal `warnings`. The diff is the abstract, dialect-independent description of "what changed" that the SQL generator later turns into DDL.

## Top-level types

```ts
// src/types/diff/schema.ts
interface SchemaDiff {
  hasChanges: boolean;       // changes.length > 0
  changes: SchemaChange[];   // sorted ascending by priority
  warnings: string[];        // e.g. destructive-operation notices
}
```

`SchemaChange` (`src/types/diff/changes.ts`) is a discriminated union keyed on `type`. Every member carries a numeric `priority`:

| `type` | extra fields | priority constant |
| --- | --- | --- |
| `create_table` | `tableName`, `table: Omit<TableSchema, "relations">` | `CREATE_TABLE` (20) |
| `drop_table` | `tableName`, `cascade` | `DROP_TABLE` (130) |
| `rename_table` | `fromName`, `toName` | `RENAME_TABLE` (80) |
| `add_column` | `tableName`, `column: ColumnSchema` | `ADD_COLUMN` (30) |
| `drop_column` | `tableName`, `columnName` | `DROP_COLUMN` (120) |
| `rename_column` | `tableName`, `fromName`, `toName` | `RENAME_COLUMN` (75) |
| `alter_column` | `tableName`, `columnName`, `changes` (per-attribute `{from,to}`) | `ALTER_COLUMN` (70) |
| `add_index` | `tableName`, `index: IndexSchema` | `ADD_INDEX` (40) |
| `drop_index` | `tableName`, `indexName` | `DROP_INDEX` (110) |
| `add_foreign_key` | `tableName`, `foreignKey: ForeignKeySchema` | `ADD_FOREIGN_KEY` (50) |
| `drop_foreign_key` | `tableName`, `constraintName` | `DROP_FOREIGN_KEY` (100) |
| `create_enum` | `enumDef: EnumSchema` | `CREATE_ENUM` (10) |
| `drop_enum` | `enumName` | `DROP_ENUM` (140) |
| `alter_enum` | `enumName`, `addValues?`, `removeValues?` | `ALTER_ENUM` (60) |

> Note: `rename_table` / `rename_column` change types exist in the union and have SQL generators, but the current diff algorithm never *produces* them — a rename is detected as a drop + add (a removed name plus an added name). They are available for callers that construct changes manually.

## Priority ordering

```ts
// src/diff/priority.ts  (lower = executed first)
CREATE_ENUM: 10,  CREATE_TABLE: 20,  ADD_COLUMN: 30,  ADD_INDEX: 40,  ADD_FOREIGN_KEY: 50,
ALTER_ENUM: 60,   ALTER_COLUMN: 70,  RENAME_COLUMN: 75, RENAME_TABLE: 80,
DROP_FOREIGN_KEY: 100, READD_FOREIGN_KEY: 105, DROP_INDEX: 110, READD_INDEX: 115,
DROP_COLUMN: 120, DROP_TABLE: 130, DROP_ENUM: 140
```

This single ordering is the contract between the diff and SQL layers. Creates come before the things that depend on them (enums before tables, tables before FKs, columns before indexes); drops come last and in reverse dependency order (FKs before indexes before columns before tables). The two `READD_*` slots sit just after their matching drop so that a **changed** index or FK (handled as drop + re-add) re-creates *after* the old one is removed, rather than racing it. `diffSchemas` sorts once with `a.priority - b.priority`, so the generator can iterate `diff.changes` blindly.

## Entry point: `diffSchemas`

```ts
// src/diff/diffSchemas.ts
export function diffSchemas(previous: ModuleSchema, current: ModuleSchema): SchemaDiff
```

Algorithm:

1. Diff enums first via `diffEnums(previous.enums ?? [], current.enums ?? [])`.
2. Build name→table maps for both sides (`createNameMap`).
3. For the union of all table names, call `diffTable(old?, new?)` and collect changes + warnings.
4. Sort all changes by `priority`.
5. Return `{ hasChanges, changes, warnings }`.

## Per-concern diffing

### Tables — `diff/tables.ts`

`diffTable(oldTable?, newTable?)`:

- only `new` → one `create_table` change (FKs/indexes are emitted separately by the snapshot generator, not inlined here).
- only `old` → one `drop_table` (`cascade: true`) **plus a warning** `"Dropping table '<name>' will delete all data in it"`.
- both → recurse into `diffColumns`, `diffIndexes`, `diffForeignKeys`.

### Columns — `diff/columns.ts`

`diffColumns(tableName, oldCols, newCols)`:

- Added (in new, not old) → `add_column`.
- Removed (in old, not new) → `drop_column`.
- Present in both but `!columnsEqual` → `alter_column` with a `changes` object holding only the attributes that differ: `type`, `nullable`, `default`, `length`, `scale`, `unique`, `array` — each as `{ from, to }`. If, after building, no sub-changes remain, no `alter_column` is emitted.

`columnsEqual` (`diff/utils.ts`) compares `type`, `nullable`, `primaryKey`, `unique`, `length`, `scale`, `default`, `array`, `enum`.

### Indexes — `diff/indexes.ts`

Indexes are keyed by name; when an index has no explicit `name`, a synthetic one is derived: `${tableName}_${col1_col2}_idx`. `indexesEqual` compares `unique`, `type`, `where`, and `JSON.stringify(columns)`. A **changed** index becomes `drop_index` (priority `DROP_INDEX` 110) + `add_index` at the higher `READD_INDEX` priority (115), so the re-add sorts after the drop (PostgreSQL cannot alter an index in place). A purely *added* index uses the normal `ADD_INDEX` priority (40). Added indexes carry the resolved `name` so the generator and a later drop agree on it.

### Foreign keys — `diff/foreignKeys.ts`

Keyed by `fk.name`. `foreignKeysEqual` compares `referencedTable`, `onDelete`, `onUpdate`, `deferrable`, `match`, and JSON of `columns` / `referencedColumns`. A **changed** FK becomes `drop_foreign_key` (priority `DROP_FOREIGN_KEY` 100) + `add_foreign_key` at the higher `READD_FOREIGN_KEY` priority (105), so the re-add sorts after the drop (no `ALTER CONSTRAINT` in PostgreSQL). A purely *added* FK uses the normal `ADD_FOREIGN_KEY` priority (50).

### Enums — `diff/enums.ts`

`diffEnums(oldEnums, newEnums)`:

- Added → `create_enum`.
- Removed → `drop_enum`.
- Both, `!nativeEnumsEqual` → compute `addValues` / `removeValues` set-wise and emit `alter_enum` (with only the populated arrays). `nativeEnumsEqual` compares `schema` and the **sorted** value lists (order-insensitive). When values are removed, a warning is added: PostgreSQL cannot drop enum values in place; the type must be recreated.

## Reverse diff — `diff/reverse.ts`

```ts
export function reverseDiff(diff: SchemaDiff): SchemaDiff
```

Produces the inverse of a forward diff for `down` migrations:

- `create_table` → `drop_table`; `add_column` → `drop_column`; `add_index` → `drop_index`; `add_foreign_key` → `drop_foreign_key`; `create_enum` → `drop_enum`.
- `alter_column` → an `alter_column` with every `{from,to}` swapped.
- `alter_enum` → an `alter_enum` with `addValues`/`removeValues` swapped.
- `drop_*`, `rename_table`, `rename_column` → **skipped** (cannot be reconstructed without the original definition).
- The resulting list is `.reverse()`d so undo operations run in opposite order.

Because drops are not reversible, true rollback relies on regenerating from the **previous snapshot**, not solely on `reverseDiff`.

## Edge cases & gotchas

- **Renames look like drop+add.** Renaming a column or table produces a `drop_*` + `add_column`/`create_table`, which is destructive. The diff layer never auto-detects renames.
- **Primary-key changes are not surfaced as `alter_column`** — `columnsEqual` includes `primaryKey`, so a PK change marks the column "not equal", but the `alter_column.changes` object only records `type/nullable/default/length/scale/unique/array`; a bare PK flip therefore produces an empty change set and is dropped. Handle PK changes via table recreation.
- **Index/FK identity is name-based.** Renaming an index/FK while keeping its definition reads as drop+add.
- **`drop_table` always uses `cascade: true`** at the diff level; the actual `CASCADE` keyword is still gated by SQL options.

## Safe extension

- New change kinds: add the interface to `types/diff/changes.ts`, add it to the `SchemaChange` union, add a `PRIORITY` constant, emit it from the relevant `diff/*.ts`, **and** add a `case` to `sqlGenerator/changeSql.ts` (the dispatch is exhaustive over the union — TypeScript will flag a missing case) and to `reverse.ts` if it is reversible.
- New comparable attributes: extend the matching `*Equal` in `diff/utils.ts` *and* the `alter_*` builder, or the change will be silently ignored.
