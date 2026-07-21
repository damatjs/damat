# ModelRegistry (`src/registry.ts`)

A runtime index over `ModelDefinition`s. Drivers build one, fill it with the
app's models, and consult it during query construction to map logical names and
table names to model metadata, and to resolve relation targets.

## `ModelRegistryEntry` (`src/types.ts`)

```ts
import type { ModelDefinition } from "@damatjs/orm-model";

export interface ModelRegistryEntry {
  model: ModelDefinition;
  tableName: string;
  schema: string | undefined;
  columns: string[];
}
```

Each entry caches the table name, the (optional) PG schema, and the _flat list of
column names_ — extracted once at registration, not recomputed per lookup.

## Construction

```ts
constructor(logger: ILogger)
```

`ModelRegistry` requires an `@damatjs/logger` `ILogger`. It uses it only to emit
a `debug` line per registration. There is no default logger.

## Registration

```ts
register(name: string, model: ModelDefinition): void
registerMany(models: Record<string, ModelDefinition>): void
```

`register()`:

1. Reads `model._tableName` and `model._schemaName`.
2. Calls `this._extractColumns(model)`, which runs `model.toTableSchema()` and
   maps `schema.columns` to their `.name`s.
3. Stores a `ModelRegistryEntry` under `name` in the `models` map.
4. Records `tableName → name` in the `tableNameIndex` reverse map.
5. Logs `Registered model: <name> -> <tableName>` at debug with column count and
   schema (`"public"` when none).

`registerMany()` just iterates `Object.entries(models)` and calls `register()`.

> **Gotcha:** columns are snapshotted at registration time. `toTableSchema()` is
> evaluated _now_, so a model mutated afterwards (e.g. another `.indexes()` /
> `.constrain()` call) will not update the cached `columns`. Register fully-built
> models.

## Lookups

```ts
get(name: string): ModelRegistryEntry | undefined
getByTableName(tableName: string): ModelRegistryEntry | undefined
getColumns(name: string): string[]            // [] when unknown
getAll(): Map<string, ModelRegistryEntry>     // the live internal map
has(name: string): boolean
getTableNames(): string[]                      // keys of tableNameIndex
getModelNames(): string[]                      // keys of models
```

- `getByTableName` does a two-step hop: table name → logical name (via
  `tableNameIndex`) → entry (via `models`). Returns `undefined` if either step
  misses.
- `getColumns` is a convenience over `get(name)?.columns ?? []`.
- `getAll()` returns the **live** internal `Map` (not a copy). Callers must not
  mutate it.

## Relation resolution

```ts
resolveRelation(modelName: string, propertyName: string): ModelRegistryEntry | undefined
```

Steps:

1. `get(modelName)` → entry (return `undefined` if missing).
2. `entry.model.toTableSchema()` → read `schema.relations`.
3. Find the relation whose `from` equals `propertyName`
   (`schema.relations?.find(r => r.from === propertyName)`), where `from` is the
   property name the relation was defined under on the model.
4. Return `getByTableName(relation.to)` — the target model's entry, looked up by
   the relation's target table name.

> **Note:** `relation.to` is a table name, so resolution goes through the
> `tableNameIndex` (not the logical-name map). A relation whose target table is
> not registered resolves to `undefined`. `toTableSchema()` is re-evaluated on
> every call here — cache it if this becomes hot. The companion driver-side
> resolver lives in `@damatjs/orm-pg` (`src/query/relations/resolver.ts`).

## `ModelRegistryError`

```ts
export class ModelRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelRegistryError";
  }
}
```

Plain named error. The registry itself never throws it — getters return
`undefined`. It exists for _consumers_ to throw on a required-but-missing model,
e.g. orm-pg's entity managers:

```ts
const entry = registry.get(modelName);
if (!entry) throw new ModelRegistryError(`Model "${modelName}" not registered`);
```

## Extending

- New index dimension (e.g. by alias): add a `Map`, populate it inside
  `register()`, expose a getter. `registerMany()` then works unchanged.
- Don't move column extraction out of `register()` unless you also handle
  invalidation — the snapshot semantics are intentional and cheap.
