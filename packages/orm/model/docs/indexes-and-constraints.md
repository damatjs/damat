# Indexes and constraints

Covers `IndexBuilder`, `ConstraintBuilder`, and the index-normalisation helper.
Source under `src/properties/indexes/`, `src/properties/constraints/`, and
`src/utils/cleanupIndex.ts`.

Both builders are reached either via the `columns` factory
(`columns.indexes(name?)`, `columns.constrains(name?)`) or via the dedicated
factory functions (`indexBuilder(name)`, `constrainBuilder(name)`), and are
attached to a model with `.indexes([...])` / `.constrain([...])`.

## `IndexBuilder` (`src/properties/indexes/base.ts`)

```ts
class IndexBuilder {
  constructor(name?: string); // empty name → auto-generated later
  columns(cols: (string | IndexColumn)[]): this; // strings normalised to { name }
  unique(): this;
  type(indexType: IndexType): this; // default "btree"
  where(condition: string): this; // partial index
  concurrently(): this; // CREATE INDEX CONCURRENTLY
  toSchema(tableName: string, indexNumber?: number): IndexSchema;
}
```

`toSchema()`:

1. If no name was set, builds a base name `"<tableName>_<col1_col2_…>"`.
2. Delegates to `cleanupIndexSchema(tableName, {...}, indexNumber)` for final
   normalisation and naming.

> Important: `toSchema()` takes `tableName` and an `indexNumber`. These are
> supplied by `ModelDefinition.indexes()`, which calls
> `entry.toSchema(this._tableName, i + 1)` — so index numbering is 1-based and
> derived from array position. Calling `toSchema()` standalone requires you to
> pass the table name yourself.

## `cleanupIndexSchema` (`src/utils/cleanupIndex.ts`)

```ts
cleanupIndexSchema(tableName: string, index: IndexSchema, indexNumber?: number): IndexSchema
```

- Normalises every column to `{ name }` (preserving `order` when present).
- Auto-generates a name when `index.name` is unset:
  `"<idx_|uniq_><tableName>_<col1_col2_…>"`, suffixed with `_<indexNumber>` when
  provided. `uniq_` prefix when `unique`, else `idx_`.
- Emits `name`, `columns`, `unique` (defaulting `false`), plus `type` and `where`
  only when set.

> Gotcha: `cleanupIndexSchema` does **not** carry through `concurrently`. The
> `IndexBuilder` accepts `.concurrently()` and passes it in, but the cleanup
> output drops it. If `concurrently` needs to reach DDL, fix it here. `unique` is
> always defaulted to `false` (never left undefined).

Naming precedence subtlety: `IndexBuilder.toSchema()` may set its own
`"<tableName>_<cols>"` name first; only if it leaves the name empty does
`cleanupIndexSchema` apply the `idx_`/`uniq_` prefixed form. So an unnamed
`columns.indexes().columns(["sku"]).unique()` ends up named like
`product_sku` (set by the builder) rather than `uniq_product_sku` — pass a name
explicitly when you care about the exact identifier.

## `ConstraintBuilder` (`src/properties/constraints/base.ts`)

The constraint **type** is declared via a method, not the constructor — this keeps
intent explicit and self-documenting.

```ts
class ConstraintBuilder {
  constructor(name?: string);
  columns(cols: string[]): this; // for unique / primary_key
  unique(): this; // type = "unique"
  primaryKey(): this; // type = "primary_key"
  check(condition: string): this; // type = "check"
  exclude(expressions: { column; operator; expression? }[]): this; // type = "exclude"
  indexType(indexType: IndexType): this; // exclude only, default "gist"
  where(condition: string): this; // partial constraint
  deferrable(initiallyDeferred = false): this;
  toSchema(): ConstraintSchema;
}
```

`toSchema()`:

- **Throws** if no type was declared (`.unique()`/`.primaryKey()`/`.check()`/
  `.exclude()` must be called first).
- Auto-names when unset: `"<type>_<col1_col2_…>"`.
- Per type:
  - `unique` → `{ name, type, columns }`.
  - `primary_key` → `{ name: "<name>_pkey", type, columns }` (note the `_pkey`
    suffix is appended even to an explicit name).
  - `check` → `{ name, type, condition }`.
  - `exclude` → `{ name, type, expressions, indexType }`.
- Then attaches `where`, `deferrable`, `initiallyDeferred` when set.

> Gotcha: `primaryKey()` always appends `_pkey` to the resolved name. If you pass
> `constrainBuilder("orders_pkey").primaryKey()` you get `orders_pkey_pkey`. Pass
> the base name without the suffix.

## Attaching to a model

```ts
model("order", { ... })
  .indexes([
    columns.indexes("idx_order_total").columns(["total"]).type("btree"),
    columns.indexes().columns(["status", "createdAt"]),       // auto-named
  ])
  .constrain([
    columns.constrains("orders_total_pos").check("total > 0"),
    columns.constrains().columns(["sku"]).unique(),            // auto-named
  ]);
```

Both `.indexes()` and `.constrain()` **replace** the model's array each call
(they don't append). FK-driven indexes from `belongsTo().indexed()` are appended
separately at `toTableSchema()` time, onto a copy of `_indexes`, so they coexist
with explicit indexes without mutating them.

## Edge cases

- A constraint or index with no columns and no name produces a degenerate
  auto-name (trailing separators). Always name multi-purpose constraints.
- `exclude` expressions are passed through verbatim into `ExcludeConstraint.expressions`;
  validate operators yourself — there's no checking here.
- `IndexColumn.order` (`ASC`/`DESC`) is preserved through normalisation; index
  `type`/`where` are preserved; `concurrently` is currently lost in cleanup.

## Extending

- New index capability → add a setter to `IndexBuilder`, thread it through
  `cleanupIndexSchema`, and extend `IndexSchema` in `@damatjs/orm-type` if needed.
- New constraint kind → add a method that sets `_type`, add a branch in
  `toSchema()`, and extend `ConstraintType`/`ConstraintSchema` in
  `@damatjs/orm-type`, plus the DDL generator downstream.
