# `ModuleService` & generated CRUD

Source: `src/service/module.ts`, `src/service/methods.ts`, `src/service/type.ts`.

## Responsibility

`ModuleService(config)` is a **class factory**. Given a map of model name → `ModelDefinition` (and an optional zod credentials schema), it returns an abstract base class that:

- validates credentials in its constructor,
- registers every model with the shared `PgEntityManager`,
- exposes one `ModelMethods` accessor per model (camelCased name),
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

### Constructor steps (`module.ts:24-44`)

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
    modelMethodsMap.set(modelName, new ModelMethods(model, modelName, entityManager));
  }
}
```

1. **Validate credentials** with zod (`.parse`, so it throws `ZodError` on bad input) — only if a schema was supplied.
2. **Assert the pool is initialized** — throws otherwise.
3. **Register each model** with the entity manager and create a `ModelMethods` for it, cached in a `modelMethodsMap` (a `Map` closed over by the factory).

### Per-model accessors (`module.ts:96-116`)

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

So `service.user` returns the `ModelMethods` for the `user` model.

### `transaction(callback, options?)` (`module.ts:55-89`)

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
  orderBy?: Array<{ column: Cols; direction?: "ASC" | "DESC" }>;
  skip?: number;
  take?: number;
  include?: string[];     // relation names to eager-load
}
interface CreateOptions<TData = Record<string, unknown>> { data: TData; returning?: string[]; }
interface CreateManyOptions<TData = Record<string, unknown>> { data: TData[]; returning?: string[]; }
interface UpdateOptions<TData = Record<string, unknown>> { where: Record<string, unknown>; data: TData; returning?: string[]; }
interface DeleteOptions { where: Record<string, unknown>; returning?: string[]; }
interface SoftDeleteOptions { where: Record<string, unknown>; returning?: string[]; }
interface CountOptions { where?: Record<string, unknown>; }
interface ExistsOptions { where: Record<string, unknown>; }
```

### Relation loading (`methods.ts:136-188`)

When `find`/`findMany` is given `include: [...]`, `loadRelations` matches each name against the `from` field of the model's `RelationSchema[]` (cached from `model.toTableSchema().relations`) and calls `loadRelation`, which resolves the related repository via `relation.to`:

- **`belongsTo`** — reads the FK column (`relation.linkedBy[0]`) off the record and fetches the related row by `id`.
- **`hasMany`** — fetches related rows where `<relation.mappedBy[0] || model._name>_id == record.id`.
- **`hasOne`** — same as `hasMany` but returns a single row.

The loaded data is attached to the record under the relation name.

## Gotchas

- **`toCamelCase` only lowercases the first character.** Accessor for a model keyed `"user_profile"` is `service.user_profile` (the underscore is kept). Choose model keys that read well as JS identifiers (`account`, `verification`, `apiKey`). It does not convert snake_case/kebab-case/PascalCase fully.
- **Construct after the pool is up.** Instantiating a generated service before `PoolManager.setup(...)` throws. The framework guarantees ordering; in tests, call `PoolManager.setup(...)` (or use a harness) before `new YourService(...)`.
- **`modelMethodsMap` is per-factory-call, shared across instances.** Each call to `ModuleService({...})` closes over its own `Map`. Two instances of the same generated class share that map — fine in practice (the methods are stateless except for the transactional-EM flag, which `transaction()` sets/clears synchronously around the callback). Avoid running two concurrent `transaction()` calls on two instances of the *same* class, since they share the `ModelMethods` objects.
- **Writes are validated against the model's columns.** `create`/`createMany`/`update` call `this._validateData(...)`, which builds (and caches) a zod schema from the model's `toTableSchema().columns` (`getValidationSchema`/`columnToZodType`) and `.parse`s the payload — so it **throws** `ZodError` on type-mismatched data. Auto-generated columns (primary key, autoincrement), columns with a default, and nullable columns are optional; nullable columns also accept `null`. Updates validate in `partial` mode, so only the supplied fields are checked. Column types with no single JS representation (json/jsonb, bytea, ranges, network, geometric, …) map to `z.any()` and are effectively unchecked.
- **`relation FK naming is convention-based.** Non-standard FK column names won't be resolved by `loadRelation`; for those, load manually or extend the relation metadata.
- **`config.types` is reserved.** `ModuleServiceConfig` accepts a `types` field, but the factory ignores it currently.

## Safe extension

- Add custom methods on your subclass; use the generated accessors and `this.transaction(...)`.
- To add a new model, add it to the `models` map — a new accessor and registration appear automatically.
- If you need raw access, use `this.em` (the `PgEntityManager`) or `service.<model>.getModelDefinition()` for introspection.
