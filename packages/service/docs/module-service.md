# `ModuleService` & generated CRUD

Source: `src/service/module.ts`, `src/service/methods.ts`, `src/service/type.ts`, `src/service/cache.ts`, `src/service/events.ts`, `src/service/logging.ts`.

## Responsibility

`ModuleService(config)` is a **class factory**. Given a map of model name → `ModelDefinition` (and an optional zod credentials schema), it returns an abstract base class that:

- validates credentials in its constructor,
- registers every model with the shared `PgEntityManager`,
- exposes one `ModelMethods` accessor per model (camelCased name),
- optionally wraps each accessor with the read cache / CRUD events / query logging (the `cache` / `events` / `logQueries` config switches — see [Opt-in wrappers](#opt-in-wrappers-cache-events-query-logging)),
- provides `transaction()`, `em`, and `getModels`.

You subclass it to get a typed service for your module.

## Signature

```ts
export function ModuleService<
  TModels extends ModelsMap,
  TCredentialsSchema extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
>(config: ModuleServiceConfig<TModels, TCredentialsSchema>): abstract new (
  credentials?: TCredentialsSchema extends z.ZodObject<z.ZodRawShape>
    ? z.infer<TCredentialsSchema>
    : undefined
) => GeneratedModuleService & ModelAccessors
```

```ts
interface ModuleServiceConfig<TModels, TCredentialsSchema, TTypes> {
  models: TModels;                  // Record<string, ModelDefinition>
  credentialsSchema?: TCredentialsSchema;
  types?: TTypes;                   // reserved; not used by the factory yet
  logQueries?: boolean;             // debug `query` log per CRUD call (off by default)
  cache?: ServiceCacheConfig;       // { defaultTtl?, prefix? } — enables the read cache
  events?: boolean;                 // <model>.created|updated|deleted on the global bus
}
```

`ModelsMap = Record<string, ModelDefinition>`.

## What the generated class provides

The returned `abstract class GeneratedModuleService` has:

| Member | Type | Behaviour |
| --- | --- | --- |
| `credentials` | `z.infer<TCredentialsSchema> \| undefined` | Set in the constructor if `credentialsSchema` was provided. |
| `inTransaction` | `boolean` | Tracks whether a `transaction()` is currently active. |
| `models` | `ModelDefinition[]` | `Object.values(config.models)`. |
| `em` (getter) | `PgEntityManager` | `PoolManager.getPgEntityManager()`. |
| `getModels` (getter) | `ModelDefinition[]` | Returns `this.models`. |
| `transaction(cb, options?)` | `Promise<R>` | Runs `cb` inside a DB transaction (see below). |
| `<modelKey>` (one per model) | `ModelMethods` | Per-model CRUD accessor; key is `toCamelCase(modelName)`. |

### Constructor steps (`module.ts:27-53`)

```ts
constructor(passedCredentials?: unknown) {
  if (config.credentialsSchema) {
    this.credentials = config.credentialsSchema.parse(passedCredentials);
  }
  this.models = Object.values(models);
  if (!PoolManager.isInitialized()) {
    throw new Error("PoolManager not initialized. Call PoolManager.setup(pool) before creating service instances.");
  }
  const entityManager = PoolManager.getPgEntityManager();
  for (const [modelName, model] of Object.entries(models)) {
    entityManager.registerModel(modelName, model);
    let methods = new ModelMethods(model, modelName, entityManager);
    // Layering: cache innermost (so events fire after invalidation and a
    // query-log line covers hits and misses alike), then events, logging
    // outermost.
    if (config.cache) methods = withTaggedCache(methods, modelName, config.cache);
    if (config.events) methods = withModelEvents(methods, modelName);
    if (config.logQueries) methods = withQueryLogging(methods, modelName);
    modelMethodsMap.set(modelName, methods);
  }
}
```

1. **Validate credentials** with zod (`.parse`, so it throws `ZodError` on bad input) — only if a schema was supplied.
2. **Assert the pool is initialized** — throws otherwise.
3. **Register each model** with the entity manager and create a `ModelMethods` for it, cached in a `modelMethodsMap` (a `Map` closed over by the factory).
4. **Apply the opt-in wrappers** in a fixed order — cache innermost, then events, logging outermost. Each is a `Proxy` over the previous layer; with none of the three config switches set, the bare `ModelMethods` goes into the map unchanged.

### Per-model accessors (`module.ts:105-125`)

For each model, the factory defines a getter on the prototype named `toCamelCase(modelName)`:

```ts
Object.defineProperty(GeneratedModuleService.prototype, accessorName, {
  get(): ModelMethods {
    const existing = modelMethodsMap.get(modelName);
    if (existing) return existing;
    // fallback: create on demand if not yet cached
    const methods = new ModelMethods(model, modelName, PoolManager.getPgEntityManager());
    modelMethodsMap.set(modelName, methods);
    return methods;
  },
  enumerable: true,
  configurable: true,
});
```

So `service.user` returns the `ModelMethods` for the `user` model. Note that the on-demand fallback constructs a **bare** `ModelMethods` — no cache/events/logging wrappers. It only triggers when the accessor is reached before any instance's constructor populated the map, so in normal use (construct, then access) you always get the wrapped object.

### `transaction(callback, options?)` (`module.ts:64-98`)

```ts
async transaction<R>(callback: () => Promise<R>, options?: TransactionOptions): Promise<R>
```

- If already `inTransaction`, just runs `callback()` (no nesting — joins the outer transaction).
- Otherwise opens `em.transaction(async tx => { ... })`, sets `inTransaction = true`, and calls `methods.setTransactionalEm(tx)` on **every** model's `ModelMethods` so all CRUD inside the callback uses the same transactional entity manager.
- In `finally`, resets `inTransaction = false` and clears the transactional EM on every model (`setTransactionalEm(null)`).

## `ModelMethods<T>` — the CRUD surface

Source: `src/service/methods.ts`. Constructed with `(model, modelName, entityManager)`.

| Method | Signature (abridged) | Delegates to |
| --- | --- | --- |
| `create` | `(options: CreateOptions) => Promise<T>` | `repo.create` |
| `createMany` | `(options: CreateManyOptions) => Promise<T[]>` | `repo.createMany` |
| `upsert` | `(options: UpsertOptions) => Promise<T>` | `repo.upsert` (insert, or update on `onConflict`) — validates `data` as a full row |
| `upsertMany` | `(options: UpsertManyOptions) => Promise<T[]>` | `repo.upsertMany` — validates each row |
| `find` | `(options?: FindOptions) => Promise<(T & Record<string,any>) \| null>` | `repo.findOne` (+ relation loading) |
| `findById` | `(id, options?) => Promise<(T & Record<string,any>) \| null>` | `find({ where: { id } })` |
| `findOne` | `(where, options?) => Promise<(T & Record<string,any>) \| null>` | `find({ where })` |
| `findMany` | `(options?: FindOptions) => Promise<(T & Record<string,any>)[]>` | `repo.findMany` (+ relation loading) |
| `update` | `(options: UpdateOptions) => Promise<T[]>` | `repo.update({ set, where, returning })` |
| `updateOne` | `(options: UpdateOptions) => Promise<T \| null>` | `repo.updateOne(set, where, returning)` — returns the single affected row |
| `delete` | `(options: DeleteOptions) => Promise<number>` | `repo.delete`; with `cascade: true`, recursively removes related rows in a transaction (see below) |
| `softDelete` | `(options: SoftDeleteOptions) => Promise<T[]>` | `repo.update` setting the model's `_deletedAtField` (default `deleted_at`) to `new Date()`; with `cascade: true`, recurses (see below) |
| `restore` | `({ where, returning? }) => Promise<T[]>` | `repo.update` setting the model's `_deletedAtField` (default `deleted_at`) to `null` |
| `count` | `(options?: CountOptions) => Promise<number>` | `repo.count(where)` |
| `exists` | `(options: ExistsOptions) => Promise<boolean>` | `repo.exists(where)` |
| `setTransactionalEm` | `(tx \| null) => void` | sets/clears the transactional EM (called by `transaction()`) |
| `getModelDefinition` | `() => ModelDefinition` | introspection |

### Cascade delete (`delete`/`softDelete` with `cascade: true`)

By default `delete`/`softDelete` touch only the matched rows. Pass `cascade: true`
to also remove everything reachable through the model's `hasMany`/`hasOne`
relations, depth-first, inside a single transaction (an existing
`transaction()` is reused; otherwise one is opened):

```ts
// removes the org's teams and each team's members, then the org — atomically
await service.org.delete({ where: { id }, cascade: true });
```

For each `hasMany`/`hasOne` relation the child FK is resolved the same way
relation loading resolves it (`linkedBy`, else `<mappedBy>_id`, else
`<modelName>_id`) and the relation's `rule.onDelete` is honoured:

| `rule.onDelete` | Behaviour |
| --- | --- |
| _none_ / `CASCADE` | Recurse into the children, then remove them. |
| `SET NULL` | Null the child FK; do not delete the children. |
| `RESTRICT` / `NO ACTION` | Throw if any children exist. |

Relation cycles are broken with a visited-set, and any error rolls the whole
transaction back. `delete` returns the total number of rows removed across all
levels; `softDelete` returns the soft-deleted top-level rows.

### Repository selection (`methods.ts:36-44`)

```ts
private getRepository(): PgRepository<T> {
  if (!this.entityManager) throw new Error("EntityManager not initialized");
  if (this.transactionalEm) return this.transactionalEm.getRepository<T>(this.modelName);
  return this.entityManager.getRepository<T>(this.modelName);
}
```

When a transaction is active, the transactional EM's repository is used; otherwise the plain entity manager's. This is the mechanism that makes everything inside `transaction(cb)` atomic.

### Option types (`type.ts`)

```ts
interface FindOptions<Cols extends string = string> {
  select?: Cols[];
  where?: Record<string, unknown>;
  orderBy?: Array<{ column: Cols; direction?: "ASC" | "DESC"; nulls?: "NULLS FIRST" | "NULLS LAST" }>;
  skip?: number;          // SQL OFFSET; non-negative integer
  take?: number;          // SQL LIMIT; capped at MAX_PAGE_SIZE (1000)
  include?: string[];     // relation names to eager-load
  withDeleted?: boolean;  // include soft-deleted rows (default: filtered out)
  cache?: boolean | CacheReadOptions;  // opt into the Redis read cache (see below)
}
interface CreateOptions<TData = Record<string, unknown>> { data: TData; returning?: string[]; }
interface CreateManyOptions<TData = Record<string, unknown>> { data: TData[]; returning?: string[]; }
interface UpsertOptions<TData = Record<string, unknown>> { data: TData; onConflict: string[]; updateColumns?: string[]; set?: Record<string, unknown>; returning?: string[]; }
interface UpsertManyOptions<TData = Record<string, unknown>> { data: TData[]; onConflict: string[]; updateColumns?: string[]; set?: Record<string, unknown>; returning?: string[]; }
interface UpdateOptions<TData = Record<string, unknown>> { where: Record<string, unknown>; data: TData; returning?: string[]; }
interface DeleteOptions { where: Record<string, unknown>; returning?: string[]; cascade?: boolean; }
interface SoftDeleteOptions { where: Record<string, unknown>; returning?: string[]; cascade?: boolean; }
interface CountOptions { where?: Record<string, unknown>; withDeleted?: boolean; cache?: boolean | CacheReadOptions; }
interface ExistsOptions { where: Record<string, unknown>; withDeleted?: boolean; cache?: boolean | CacheReadOptions; }
```

`type.ts` also exports `MAX_PAGE_SIZE` (1000) — the hard upper bound on `take` — and the cache types `CacheReadOptions` (`{ ttl?, tags? }`) / `ServiceCacheConfig` (`{ defaultTtl?, prefix? }`).

### Relation loading (`methods.ts:136-188`)

When `find`/`findMany` is given `include: [...]`, `loadRelations` matches each name against the `from` field of the model's `RelationSchema[]` (cached from `model.toTableSchema().relations`) and calls `loadRelation`, which resolves the related repository via `relation.to`:

- **`belongsTo`** — reads the FK column (`relation.linkedBy[0]`) off the record and fetches the related row by `id`.
- **`hasMany`** — fetches related rows where `<relation.mappedBy[0] || model._name>_id == record.id`.
- **`hasOne`** — same as `hasMany` but returns a single row.

The loaded data is attached to the record under the relation name.

## Opt-in wrappers: cache, events, query logging

Source: `src/service/cache.ts`, `src/service/events.ts`, `src/service/logging.ts`.

All three are the same pattern: a `Proxy` whose `get` trap intercepts a fixed
set of method names on `ModelMethods` and returns an async wrapper; every
other property passes through untouched. The constructor applies them in a
fixed order — **cache innermost → events → logging outermost** — so one
`query` log line covers cache hits and misses alike, and a write's event
fires only after the write returned and its cache invalidation ran.

### `withTaggedCache(methods, modelName, config)` (`cache.ts`)

The Redis read cache behind the [README's read-caching section](../README.md#read-caching-opt-in-redis-backed). Applied when the service config carries `cache: { defaultTtl?, prefix? }` (defaults: 60 s, `"svc"`).

- **Double opt-in.** The wrapper alone caches nothing: a read is cached only
  when the *call* also passes `cache: true | { ttl?, tags? }`. Cacheable
  reads are `find`/`findMany`/`count`/`exists` (options at arg 0) and
  `findById`/`findOne` (options at arg 1); the `cache` key is the wrapper's
  own option and is **stripped** before the underlying method sees the
  options object.
- **In-transaction bypass.** If the target's `transactionalEm` is set (i.e.
  `transaction()` is active), the read goes straight to the database — a
  transaction must see its own writes. Same when `hasRedis()` is false.
- **Fail-open.** `cacheGet` and `cacheSetTagged` failures are caught and
  debug-logged (`"cache read failed — falling through to the database"` /
  `"cache write failed — result served from the database"`); the call always
  resolves from the database.
- **`null`/`undefined` results are not cached** — `cacheGet` can't tell a
  cached `null` from a miss, so negative results always recompute. `false`
  and `0` are cached.
- **Keys** are `<prefix>:<model>:<method>:<sha1>` where the hash is a
  `stableStringify` of the (cache-stripped) arguments: object keys sorted,
  `undefined` values dropped — so `{a, b}` and `{b, a}` address one entry.
- **Tags.** Every entry carries `modelCacheTag(modelName)` (`model:<name>`)
  plus any per-call `tags`. Every write method (`create`/`createMany`/
  `upsert`/`upsertMany`/`update`/`updateOne`/`delete`/`softDelete`/`restore`)
  invalidates the model tag after it succeeds; invalidation failure is also
  fail-open (debug log `"cache invalidation failed — entries expire by TTL"`).

### `withModelEvents(methods, modelName)` (`events.ts`)

Applied when the config carries `events: true`. Wraps only the write methods;
after a successful write it emits `modelEventName(modelName, kind)` —
`<model>.<kind>` — on `getEventBus()` (the `@damatjs/events` global bus) with
a `ModelEventPayload` of `{ model, method, result }` (`result` is whatever the
write returned: row, rows, or count).

| Kind | Methods |
| --- | --- |
| `created` | `create`, `createMany` |
| `updated` | `upsert`, `upsertMany`, `update`, `updateOne`, `restore` |
| `deleted` | `delete`, `softDelete` |

Emission is **awaited**, so a subscriber's side effects happen before the
write call returns — but the bus isolates subscriber errors (logged, never
thrown back into the write). A write that throws emits nothing.

### `withQueryLogging(methods, modelName)` (`logging.ts`)

Applied when the config carries `logQueries: true`. Wraps the full CRUD
surface (all fifteen read/write methods; bookkeeping like
`setTransactionalEm`/`getModelDefinition` stays unwrapped) and emits one
debug-level `query` log with `{ model, method, durationMs }` per call — in a
`finally`, so failed calls are timed too. No SQL text or parameter values are
ever logged (payloads may carry PII). Unlike the other two wrappers,
`withQueryLogging` is not re-exported from the package barrel — it is
internal to the factory.

## Gotchas

- **`toCamelCase` only lowercases the first character.** Accessor for a model keyed `"user_profile"` is `service.user_profile` (the underscore is kept). Choose model keys that read well as JS identifiers (`account`, `verification`, `apiKey`). It does not convert snake_case/kebab-case/PascalCase fully.
- **Construct after the pool is up.** Instantiating a generated service before `PoolManager.setup(...)` throws. The framework guarantees ordering; in tests, call `PoolManager.setup(...)` (or use a harness) before `new YourService(...)`.
- **`modelMethodsMap` is per-factory-call, shared across instances.** Each call to `ModuleService({...})` closes over its own `Map`. Two instances of the same generated class share that map — fine in practice (the methods are stateless except for the transactional-EM flag, which `transaction()` sets/clears synchronously around the callback). Avoid running two concurrent `transaction()` calls on two instances of the *same* class, since they share the `ModelMethods` objects.
- **Writes are validated against the model's columns.** `create`/`createMany`/`update` call `this._validateData(...)`, which builds (and caches) a zod schema from the model's `toTableSchema().columns` (`getValidationSchema`/`columnToZodType`) and `.parse`s the payload — so it **throws** `ZodError` on type-mismatched data. Auto-generated columns (primary key, autoincrement), columns with a default, and nullable columns are optional; nullable columns also accept `null`. Updates validate in `partial` mode, so only the supplied fields are checked. Column types with no single JS representation (json/jsonb, bytea, ranges, network, geometric, …) map to `z.any()` and are effectively unchecked.
- **`relation FK naming is convention-based.** Non-standard FK column names won't be resolved by `loadRelation`; for those, load manually or extend the relation metadata.
- **Events and cache invalidation fire per call, not per commit.** Neither `withModelEvents` nor the cache's write-invalidation checks for an active transaction: inside `transaction()`, a write emits its event and invalidates the model tag as soon as *that call* returns — before the transaction commits. A later rollback does not un-emit or re-populate. (Cached *reads* do bypass the cache in-transaction; writes are the asymmetric case.)
- **`config.types` is reserved.** `ModuleServiceConfig` accepts a `types` field, but the factory ignores it currently.

## Safe extension

- Add custom methods on your subclass; use the generated accessors and `this.transaction(...)`.
- To add a new model, add it to the `models` map — a new accessor and registration appear automatically.
- If you need raw access, use `this.em` (the `PgEntityManager`) or `service.<model>.getModelDefinition()` for introspection.
