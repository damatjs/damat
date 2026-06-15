# Schema and model definition

Covers `ModelDefinition` and the `model()` factory, `toTableSchema()`,
`toModuleSchema()`, the global model registry, and the timestamps/soft-delete
behavior. Source: `src/schema/model.ts`, `src/schema/toModuleSchema.ts`,
`src/utils/registry.ts`, `src/types/schema.ts`.

## `model()` and `ModelDefinition` (`src/schema/model.ts`)

```ts
function model<T extends Record<string, PropertyValue>>(
  tableName: string,
  properties: T,
  options?: { schema?: string; name?: string },
): ModelDefinition
```

`PropertyValue` (`src/types/schema.ts`) is the allowed property union:
`ColumnBuilder | BelongsToBuilder | HasManyBuilder | HasOneBuilder`.

`ModelDefinition` holds builder-phase state:

```ts
class ModelDefinition {
  readonly _tableName: string;
  readonly _name: string;                 // options.name ?? tableName
  _schemaName?: string;                    // options.schema
  readonly _properties: Record<string, PropertyValue>;
  _indexes: IndexSchema[] = [];
  _constraints: ConstraintSchema[] = [];
  _timestamps = true;
  _softDelete = true;
  _deletedAtField = "deleted_at";

  get name(): string; get tableName(): string;

  timestamps(enabled = true): this
  softDelete(enabled = true, fieldName = "deleted_at"): this
  indexes(indexes: IndexBuilder[]): this   // REPLACES; calls entry.toSchema(table, i+1)
  constrain(constraints: ConstraintBuilder[]): this  // REPLACES; calls entry.toSchema()

  toTableSchema(): TableSchema
  toTsType(typeName?: string): string
}
```

### Self-registration

The constructor calls `registerModel(this._tableName, this)`. Every model is
therefore added to the process-global registry as soon as it is constructed —
this is what makes string relation targets (`hasMany("orders")`) resolvable. See
the registry section below.

### `indexes()` / `constrain()`

Both **replace** their arrays (not append). `indexes()` resolves each
`IndexBuilder` with `entry.toSchema(this._tableName, i + 1)` — passing the table
name and a 1-based position used for index-name disambiguation. `constrain()`
resolves each `ConstraintBuilder` with `entry.toSchema()`.

## `toTableSchema()` — the core transform

Iterates `_properties` once, dispatching by builder type:

```ts
for (const [propName, propValue] of Object.entries(this._properties)) {
  if (propValue instanceof ColumnBuilder) {
    propValue._setName(propName);
    columns.push(propValue.toSchema());
  } else if (propValue instanceof BelongsToBuilder) {
    columns.push(...propValue.toColumnSchema());        // FK column(s)
    foreignKeys.push(propValue.toForeignKeySchema());   // FK constraint
    relations.push(propValue.toRelationSchema(this._tableName, propName));
    if (propValue.isIndexed())
      for (const fk of propValue.getForeignKey()) indexes.push({ columns: [fk.name] });
  } else if (propValue instanceof HasManyBuilder || propValue instanceof HasOneBuilder) {
    relations.push(propValue.toRelationSchema(this._tableName, propName));
  }
}
```

Then:

1. **Timestamps** (if `_timestamps`): append `created_at` (`date`, not null,
   default `now()`) and `updated_at` (`date`, nullable) — each only if a column of
   that name isn't already present. The presence check tolerates camelCase
   (`createdAt` / `updatedAt`).
2. **Soft delete** (if `_softDelete`): append `_deletedAtField` (default
   `deleted_at`, `date`, nullable) if absent.
3. Assemble `{ name, columns, indexes, foreignKeys, constraints, relations }`,
   adding `schema` when `_schemaName` is set.

> The FK-index array is built from a **copy** of `_indexes`
> (`const indexes = [...this._indexes]`), so `.indexed()` relations never mutate
> the model's stored index list.
>
> The auto-appended timestamp/soft-delete columns are typed `"date"` (not
> `timestamp with time zone`). If a model defines its own `createdAt`/`updatedAt`
> with a richer type, that definition wins and the auto-column is skipped.

### `toTableSchema()` output (fixture excerpt)

From the committed snapshot, a `product` with a nullable `belongsTo(Category)`
yields a `category_id` text column and:

```json
{
  "name": "category_category_id_fk",
  "columns": [{ "name": "category_id", "type": "text" }],
  "referencedTable": "category",
  "referencedColumns": ["id"],
  "onDelete": "SET NULL",
  "nullable": true
}
```

Note `onDelete: "SET NULL"` is implied by `.nullable()`, and the constraint name
is prefixed with the **target** table (`category`), not the source (`product`).

## `toTsType()`

```ts
toTsType(typeName?: string): string
```

Generates an `export interface` string for the model's **row shape**:

- `ColumnBuilder` props → `<propName>: <col.toTsType()>;`.
- `BelongsToBuilder` props → one field per FK column, named by the FK column name
  (e.g. `user_id: string;`), supporting composite FKs.
- `HasMany`/`HasOne` props → **omitted** (runtime-loaded collections, not row
  columns).
- `typeName` defaults to `toPascalCase(this._tableName)`.

This emits the *base* row type only — it does not add timestamp/soft-delete
columns (those are added in `toTableSchema()`, not here) and uses the raw enum
type name. The richer per-table files in `src/tests/__snapshots__/generated/`
(with `NewX`/`UpdateX` and `…Enum` suffixed names) come from a separate codegen
module that is not part of this package's `src/` (see
[type-inference.md](./type-inference.md)).

## `toModuleSchema()` (`src/schema/toModuleSchema.ts`)

```ts
function toModuleSchema(
  moduleName: string,
  models: ModelDefinition[],
  options?: { schema?: string; enums?: EnumBuilder[] },
): ModuleSchema
```

- Calls `m.toTableSchema()` for each model.
- **Hoists relations**: destructures `{ relations, ...rest }` from each table
  schema, pushes `relations` into a single module-level `relationships` array, and
  keeps `rest` as the table (so `tables` is `Omit<TableSchema, "relations">[]`).
- Defaults `schema` to `"public"` when not provided.
- Maps `options.enums` via `e.toSchema()` into `enums` (defaults to `[]`).

Result shape: `{ moduleName, schema, tables, enums, relationships }`.

## Global model registry (`src/utils/registry.ts`)

```ts
const MODEL_REGISTRY = new Map<string, ModelDefinition>();
registerModel(tableName, model): void
getRegisteredModel(tableName): ModelDefinition | undefined
hasRegisteredModel(tableName): boolean
```

- Module-level singleton `Map` keyed by **table name**.
- Populated automatically by the `ModelDefinition` constructor.
- Backs `resolveModuleTarget` for string relation targets.

> Gotchas: this is process-global. Two models with the same table name overwrite
> each other. In tests, models constructed in earlier cases linger — string
> targets can resolve to a stale model. Prefer direct or lazy-thunk targets
> within a file; reserve string targets for cross-module wiring where imports
> would be circular.

## `model()` options recap

```ts
model("user", { ...props }, { schema: "store", name: "User" })
```

- `schema` → PG schema for this table (sets `_schemaName`, surfaces in
  `toTableSchema().schema`).
- `name` → logical name (`_name`); defaults to the table name. Used by consumers
  that key models by logical name (e.g. the orm-core registry's `register(name, model)`).

## Extending

- New auto-column behavior → extend the timestamp/soft-delete block in
  `toTableSchema()`, keeping the "skip if already present" guard.
- New model-level fluent option → add a field + a `this`-returning setter, and
  emit it in `toTableSchema()`.
- If you change `toTableSchema()`/`toModuleSchema()` output shape, regenerate the
  snapshot (`bun run snapshot`) and update `snapshots.test.ts` expectations.
