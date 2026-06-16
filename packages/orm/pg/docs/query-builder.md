# Query Builder

Sources: [`src/query/accessor/**`](../src/query/accessor), [`src/query/base.ts`](../src/query/base.ts),
[`src/query/select/**`](../src/query/select), [`src/query/insert/**`](../src/query/insert),
[`src/query/update.ts`](../src/query/update.ts), [`src/query/delete.ts`](../src/query/delete.ts),
[`src/query/upsert.ts`](../src/query/upsert.ts), [`src/query/helpers/**`](../src/query/helpers),
[`src/query/types/**`](../src/query/types).

This is the **pure** layer: it turns a `ModelDefinition` plus an options object into a `BuiltQuery`
(`{ sql, params }`) **and** a JSON `QueryDescriptor`. Nothing here touches a database connection.

WHERE-clause compilation is split out into [where.md](./where.md); relation (`with`) loading into
[relations.md](./relations.md).

## `ModelAccessor` — the entry point

[`accessor/base.ts`](../src/query/accessor/base.ts).

```ts
class ModelAccessor<Cols extends string = string> {
  readonly _model: ModelDefinition;
  readonly builders: {
    readonly select: SelectBuilder<Cols>;   // getters — fresh builder per access
    readonly insert: InsertBuilder<Cols>;
    readonly update: UpdateBuilder<Cols>;
    readonly delete: DeleteBuilder<Cols>;
    readonly upsert: UpsertBuilder<Cols>;
  };
}
```

Each method returns `QueryResult<D> = { sql: BuiltQuery; json: D }`:

| Method | Descriptor | Builder used |
| --- | --- | --- |
| `findMany(options = {})` | `SelectDescriptor` | `SelectBuilder` |
| `findOne(options = {})` | `SelectDescriptor` | `SelectBuilder` (+ `LIMIT 1`) |
| `create(options)` | `InsertDescriptor` | `InsertBuilder` |
| `createMany(options)` | `InsertDescriptor` | `InsertBuilder` |
| `update(options)` | `UpdateDescriptor` | `UpdateBuilder` |
| `delete(options)` | `DeleteDescriptor` | `DeleteBuilder` |
| `upsert(options)` | `UpsertDescriptor` | `UpsertBuilder` |
| `upsertMany(options)` | `UpsertDescriptor` | `UpsertBuilder` |

The actual option→builder wiring lives in `accessor/find.ts` and `accessor/mutate.ts` (the
`executeFind*` / `execute*` functions), which each: construct a fresh builder, apply the options, and
return `{ sql: b.generateSql(), json: b.generateJson() }`.

> `builders.*` are **getters** returning a new builder each time — builders are single-use and hold
> per-query state. Don't cache and reuse one builder across queries.

## Option types

[`accessor/type/**`](../src/query/accessor/type). All are generic over `Cols extends string`.

### `FindOptions<Cols>` (findMany / findOne)

```ts
interface FindOptions<Cols> {
  select?: Cols[];                 // omit ⇒ SELECT *
  where?: WhereClause<Cols>;       // object-style conditions (see where.md)
  whereRaw?: RawWhereClause | RawWhereClause[];
  orderBy?: Array<{ column: Cols; direction?: "ASC"|"DESC"; nulls?: "NULLS FIRST"|"NULLS LAST" }>;
  limit?: number;
  offset?: number;
  distinct?: boolean;
  with?: RelationIncludeMap;       // eager relation loading (see relations.md)
}
```

`FindOneOptions<Cols>` (client/types.ts) is `FindOptions` without `limit`/`offset`.

### `CreateOptions` / `CreateManyOptions`

```ts
interface CreateOptions<Cols>     { data: ValuesMap<Cols>;   returning?: Cols[]; onConflict?: OnConflictClause<Cols> }
interface CreateManyOptions<Cols> { data: ValuesMap<Cols>[]; returning?: Cols[]; onConflict?: OnConflictClause<Cols> }
```

### `UpdateOptions` / `DeleteOptions`

```ts
interface UpdateOptions<Cols> {
  set: ValuesMap<Cols>;
  where?: WhereClause<Cols>;
  whereRaw?: RawWhereClause | RawWhereClause[];
  returning?: Cols[];
  allowFullTable?: boolean;   // opt-in to update with no WHERE
}
interface DeleteOptions<Cols> {
  where?: WhereClause<Cols>;
  whereRaw?: RawWhereClause | RawWhereClause[];
  returning?: Cols[];
  allowFullTable?: boolean;   // opt-in to delete with no WHERE
}
```

### `UpsertOptions` / `UpsertManyOptions`

```ts
interface UpsertOptions<Cols> {
  data: ValuesMap<Cols>;        // (UpsertManyOptions: ValuesMap<Cols>[])
  onConflict: Cols[];           // → ON CONFLICT (col, …)
  updateColumns?: Cols[];       // columns to update on conflict (via EXCLUDED)
  set?: ValuesMap<Cols>;        // explicit overrides; take precedence over EXCLUDED fallback
  returning?: Cols[];
}
```

`ValuesMap<Cols>` is `{ [K in Cols]?: unknown }` (`query/types/clauses.ts`).

## `QueryBase` — shared builder behaviour

[`query/base.ts`](../src/query/base.ts). Abstract base of all five builders.

On construction it derives, from the model:

```ts
this._resolvedColumns = model.toTableSchema().columns;       // ColumnSchema[]
this._knownCols       = columnNameSet(this._resolvedColumns); // Set<string> for fast asserts
this._tableRef        = { name: model._tableName, schema?: model._schemaName };
```

Shared chainable methods (each returns `this`):

| Method | Effect | Guard |
| --- | --- | --- |
| `where(clause)` | pushes an object-style WHERE | validated at SQL build (see where.md) |
| `whereRaw(clause)` | pushes a raw SQL fragment | — |
| `orderBy(column, direction?, nulls?)` | pushes an ORDER BY | `assertKnownColumnList([column])` |
| `returning(cols = [])` | sets RETURNING columns | `assertKnownColumnList(cols)` |

Protected build helpers: `_buildWhere(params)`, `_buildOrderBy()`, `_buildReturning()`, `_table()`,
`_assertCols(obj, ctx)`, `_assertColList(names, ctx)`. Subclasses implement `generateSql(): BuiltQuery`
and `generateJson(): QueryDescriptor`.

### Column-existence guard

`assertKnownColumns` / `assertKnownColumnList` ([helpers/asserts.ts](../src/query/helpers/asserts.ts))
throw before any SQL is emitted:

```
[query:select.columns] Unknown column "emial". Known columns: id, email, name, verified
```

Every builder runs this on columns and value maps, so typos fail loudly with the full known-column list.

## SelectBuilder

[`select/builder.ts`](../src/query/select/builder.ts).

Chainable state: `columns(cols)`, `distinct()`, `limit(n)`, `offset(n)`, `with(relations)` plus the
inherited `where`/`whereRaw`/`orderBy`.

- `limit`/`offset` reject non-integers and negatives:
  `[query:select.limit] Expected non-negative integer, got …`.
- `columns([])` (empty) ⇒ `SELECT *`.

`generateSql()` (no relations) assembles:

```
SELECT [DISTINCT] <cols|*> FROM <table> [WHERE …] [ORDER BY …] [LIMIT n] [OFFSET n]
```

When `with` relations are present it switches to an aliased form (`<table> "_p"`) and appends
`LEFT JOIN LATERAL (…)` subqueries returning JSON-aggregated relation columns — fully described in
[relations.md](./relations.md). `generateJson()` delegates to `buildSelectJson` (select/json.ts),
producing a `SelectDescriptor` (and nested `RelationDescriptor[]` under `with`).

## InsertBuilder

[`insert/builder.ts`](../src/query/insert/builder.ts).

- `values(input)` accepts one row or an array; empty array is a no-op; each row's keys are validated
  via `_assertCols(row, "insert.values")`.
- `onConflict(clause)` accepts an `OnConflictClause<Cols>` (validates `conflictColumns` and, for
  `action: "update"`, the `set` map).
- `generateSql()` throws `[query:insert] No values provided` if no rows. Column names come from the
  **first** row's keys; every row is bound positionally to those columns.

```
INSERT INTO <table> (col, …) VALUES ($1, …), ($n, …) [ON CONFLICT …] RETURNING …
```

### `OnConflictClause` (insert/conflict.ts)

```ts
type OnConflictAction = "nothing" | "update";
interface OnConflictClause<Cols> { conflictColumns?: Cols[]; action: OnConflictAction; set?: ValuesMap<Cols> }
```

`buildOnConflictSql`:

- `action: "nothing"` ⇒ `ON CONFLICT (cols) DO NOTHING` (target omitted if no `conflictColumns`).
- `action: "update"` with `set` ⇒ `DO UPDATE SET col = $N, …` (parameterised).
- `action: "update"` without `set` ⇒ `DO UPDATE SET col = EXCLUDED.col` for the conflict columns, or a
  fallback of `"id" = EXCLUDED."id"` when no conflict columns are given.

> **Gotcha:** `InsertBuilder.onConflict` (the `OnConflictClause` form) and `UpsertBuilder` are two
> different upsert paths. `create`/`createMany` use `OnConflictClause`; `upsert`/`upsertMany` use
> `UpsertBuilder` with `onConflict: Cols[]` + `updateColumns`/`set`. They generate similar but
> separately-built SQL.

## UpdateBuilder

[`update.ts`](../src/query/update.ts).

- `set(values)` merges into accumulated set (validated); `allowFullTable()` opts into no-WHERE.
- `generateSql()` throws if `set` is empty (`[query:update] No columns to update`) **and** throws
  `[query:update] No WHERE clause — this would update every row.` unless a WHERE exists or
  `allowFullTable()` was called.

```
UPDATE <table> SET col = $N, … [WHERE …] [ORDER BY …] RETURNING …
```

## DeleteBuilder

[`delete.ts`](../src/query/delete.ts).

- `allowFullTable()` opts into no-WHERE.
- `generateSql()` throws `[query:delete] No WHERE clause — this would delete every row.` unless a WHERE
  exists or `allowFullTable()` was set.

```
DELETE FROM <table> [WHERE …] RETURNING …
```

## UpsertBuilder

[`upsert.ts`](../src/query/upsert.ts).

State: `values(input)`, `onConflict(cols)`, `updateColumns(cols)`, `set(values)` — all column-validated.

`generateSql()` throws on no rows (`[query:upsert] No values provided`) or no conflict columns
(`[query:upsert] No conflict columns specified`). Emits:

```
INSERT INTO <table> (col, …) VALUES (…), (…) ON CONFLICT (conflictCols) DO UPDATE SET <fragments> RETURNING …
```

`_buildSetFragments` decides what gets updated on conflict:

1. Start from `updateColumns` if provided, else **all inserted columns minus the conflict columns**.
2. Remove any columns also present in explicit `set` (those are handled separately).
3. The remaining columns become `col = EXCLUDED.col`.
4. Explicit `set` entries become parameterised `col = $N` and **take precedence**.

So `set` overrides `EXCLUDED` for the keys it names, and `updateColumns` narrows which columns get the
`EXCLUDED` treatment.

## Helpers

[`helpers/`](../src/query/helpers):

| Helper | File | Purpose |
| --- | --- | --- |
| `quoteIdent(name)` | ident.ts | `"name"` with embedded `"` doubled — identifier safety. |
| `buildTableRef(ref)` | ident.ts | `"schema"."table"` or `"table"`. |
| `assembleQuery(parts, params)` | assemble.ts | Filters empty parts, joins with spaces ⇒ `{ sql, params }`. |
| `buildOrderByClause(clauses)` | clauses.ts | `ORDER BY "col" DIR NULLS …`. |
| `buildReturningClause(cols)` | clauses.ts | `RETURNING *` when empty, else quoted list. |
| `assertKnownColumns` / `assertKnownColumnList` | asserts.ts | Column-existence guards. |
| `columnNameSet(columns)` | asserts.ts | `Set<string>` of column names. |
| `buildWhereClause` / `compileCondition` | where/* | WHERE compilation — see [where.md](./where.md). |

## Types (`query/types/**`)

`types/clauses.ts` re-exports `WhereOperators`, `WhereClause`, `RawWhereClause`, `OrderDirection`,
`OrderByClause`, `BuiltQuery` (all from `@damatjs/orm-type`) and defines `ValuesMap`,
`ColumnNameUnion`, and `ColumnBaseType`/`ColumnWriteType` (maps SQL types to TS types).
`types/descriptors.ts` re-exports the `*Descriptor` shapes.

## Invariants & gotchas

- **Identifiers quoted, values parameterised** everywhere — no value is string-interpolated into SQL
  in this layer.
- **Insert/upsert column order is taken from the first row.** All rows must share the same key set,
  or later rows bind values to the wrong columns.
- **Empty `select: []` means `SELECT *`** (used deliberately by `PgRepository.count`).
- Builders throw, not return errors — wrap generation in try/catch if you build untrusted queries.

## Extending safely

- New operations: add a builder extending `QueryBase`, an accessor method + `execute*` wiring, then a
  client/repository method. Keep generation pure (no DB access).
- Always run `_assertCols` / `_assertColList` on caller-provided column names.
- For any new value going into SQL, push it onto `params` and emit `$${params.length}` — never interpolate.
- Keep `generateSql()` and `generateJson()` in sync so the descriptor faithfully mirrors the SQL.
