# Entity Manager

Sources: [`src/manager/entityManager.ts`](../src/manager/entityManager.ts),
[`src/manager/transactionalEntityManager.ts`](../src/manager/transactionalEntityManager.ts),
[`src/manager/error.ts`](../src/manager/error.ts).

The manager layer is the top-level entry point. It wraps a `Pool`, owns a `ModelRegistry`, caches one
`PgRepository` per model, and runs transactions. `PgEntityManager` is also re-exported as
`EntityManager` from the package root.

## `PgEntityManager`

```ts
class PgEntityManager<TModels extends Record<string, ModelDefinition> = …> {
  constructor(config: PgEntityManagerConfig) // { pool: Pool; logger?: ILogger; models?: TModels }
}
```

On construction it:

1. stores `config.pool`,
2. builds a logger (uses `config.logger`, else `new Logger({ prefix: "ORM", timestamp: true })`),
3. creates a `ModelRegistry(logger)` and a `TransactionManager(pool, logger)`,
4. if `config.models` is given, `registerModel(name, model)` for each entry,
5. calls `_initializeRepositories()` — builds a repo for every model already in the registry.

> **Config:** `PgEntityManagerConfig` is `{ pool, logger?, models? }`. The `models` map is optional;
> models passed there are registered at construction. You can also register later with
> `registerModel(name, model)`.

### Dynamic model accessors

Every registered model also gets a getter on the manager itself, so `em.user` returns the cached
repository for `"user"` (the same instance as `em.repo("user")`). `_defineModelAccessor(name)` installs
it during `registerModel`, but only if the name does not already exist on the instance — a model named
after a real method/field (e.g. `transaction`, `pool`) keeps the method, and you reach its repo via
`getRepository(name)`. This mirrors the `tx.<model>` accessors on the transactional manager.

### Methods

| Method | Behaviour |
| --- | --- |
| `registerModel(name, model)` | Registers in the `ModelRegistry`, eagerly creates+caches a `PgRepository`, and installs the `em.<name>` accessor. |
| `getRepository<T>(name)` / `repo<T>(name)` | Returns the cached repo; throws `ModelRegistryError` if the model is not registered; lazily creates+caches on first access. |
| `transaction<R>(cb, options?)` / `tx<R>(cb, options?)` | Runs `cb` inside a transaction; `cb` receives a `TransactionalEntityManager` (typed with `tx.<model>` accessors). |
| `raw<T>(sql, params?, ctx?)` / `execute<T>(sql, params?)` | Runs raw SQL on the pool; returns `{ rows, rowCount }`; wraps driver errors in `QueryExecutionError`. |
| `getPool()` | The underlying `Pool`. |
| `getModelRegistry()` | The `ModelRegistry`. |
| `getRegisteredModels()` | `string[]` of registered model names. |

### Repository caching

```ts
private repositories = new Map<string, PgRepository<QueryResultRow>>();
```

- `getRepository(name)` returns the cached repo if present, else `createRepository(entry.model, this.pool, this.logger)` and caches it.
- `registerModel(name, model)` populates the cache eagerly.
- All cached pool-bound repos share the manager's `Pool` (each statement may run on a different pooled
  connection — fine for non-transactional work).

### Transactions

```ts
async transaction<R>(cb, options?): Promise<R> {
  return this.transactionManager.run(async (ctx) => {
    const txManager = new TransactionalEntityManager<TModels>(this.modelRegistry, ctx, this.logger);
    return cb(txManager as any);
  }, options);
}
```

`TransactionManager.run` handles BEGIN → callback → COMMIT, with ROLLBACK + client release on error
(see [transactions.md](./transactions.md)). The callback receives a `TransactionalEntityManager` whose
repos are bound to the transaction's single `PoolClient`, so every statement runs in the same
transaction. `options` is a `TransactionOptions` (`isolationLevel` / `readOnly` / `deferrable`).

### Raw SQL

```ts
async raw<T>(sql, params?): Promise<{ rows: T[]; rowCount: number }> {
  try { const r = await this.pool.query<T>(sql, params || []); return { rows: r.rows, rowCount: r.rowCount ?? 0 }; }
  catch (e) { throw new QueryExecutionError(`Query failed: ${e.message}`, e); }
}
```

Bypasses the builder entirely — caller-supplied SQL. `execute` is an alias. The optional `_ctx`
parameter on `raw` is currently unused.

## `TransactionalEntityManager`

This is the `tx` object passed to `em.transaction(tx => …)`.

```ts
class TransactionalEntityManager<TModels …> {
  [key: string]: any; // dynamic model accessors live here
  constructor(modelRegistry, transactionContext, logger, modelsConfig?)
}
```

### Dynamic model accessors

The constructor installs a getter for each model name (from `modelsConfig` keys, else
`modelRegistry.getModelNames()`):

```ts
for (const key of modelNames) {
  Object.defineProperty(this, key, { get: () => this.getRepository(key), enumerable: true, configurable: true });
}
```

So `tx.user` returns the transaction-bound repository for `"user"`. `tx.repo("user")` is equivalent.

### Transaction-bound repositories

```ts
getRepository<T>(name) {
  const entry = this.modelRegistry.get(name);
  if (!entry) throw new ModelRegistryError(`Model "${name}" not registered`);
  const cached = this.repositories.get(name);
  if (cached) return cached;
  const client = this.transactionContext.getClient();          // the txn's PoolClient
  const repo = createRepository<T>(entry.model, client, this.logger, true); // isInTransaction = true
  this.repositories.set(name, repo);
  return repo;
}
```

Each repo is created against the transaction's `PoolClient` (not the pool), guaranteeing every
operation runs inside the active transaction. They are cached for the lifetime of the transaction.

### Other methods

| Method | Behaviour |
| --- | --- |
| `query<T>(sql, params?)` / `execute<T>(...)` | Raw SQL on the transaction client (`transactionContext.query`). |
| `createSavepoint(name)` | `SAVEPOINT <name>` (name sanitised by the context). |
| `rollbackToSavepoint(name)` | `ROLLBACK TO SAVEPOINT <name>`. |
| `releaseSavepoint(name)` | `RELEASE SAVEPOINT <name>`. |

## Errors (`manager/error.ts`)

```ts
class EntityManagerError extends Error { constructor(message, cause?) … }
class QueryExecutionError extends Error { constructor(message, cause?) … }
```

`QueryExecutionError` wraps driver failures from `raw`/`execute`. Both carry an optional `cause` and
set a fixed `name`. (`EntityManagerError` is exported for callers but not thrown in the current
manager paths — model-not-found uses `ModelRegistryError` from `@damatjs/orm-core`.)

## Edge cases & gotchas

- Calling `getRepository`/`repo` for an unregistered model throws `ModelRegistryError`.
- A `PgEntityManager` built without `config.models` has zero repos until you `registerModel`;
  `_initializeRepositories` only picks up models already in the registry at construction time (the
  `config.models` entries are registered just before it runs).
- The `em.<model>` accessor is skipped when the model name collides with an existing method/field —
  use `getRepository(name)` for those.
- `tx.<model>` accessors are derived from registry names at the moment the `TransactionalEntityManager`
  is constructed — register models before opening the transaction.
- Non-transactional repo statements may each land on different pooled connections; use a transaction
  when you need them to share one.

## Extending safely

- New convenience methods belong on `PgRepository` (so both manager and transactional managers get
  them) rather than duplicated on the managers.
- Preserve the repo-cache contract: never return an un-cached repo for a model that has a cached one,
  or transaction binding will leak.
- If you add transaction options, thread them through `TransactionManager._beginTransaction` and keep
  the isolation-level allow-list intact (see [transactions.md](./transactions.md)).
