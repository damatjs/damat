# Model Client

Sources: [`src/client/base.ts`](../src/client/base.ts), [`src/client/ops/**`](../src/client/ops),
[`src/client/types.ts`](../src/client/types.ts).

`PgModelClient` is the per-model CRUD layer. It glues the pure query layer (`ModelAccessor`) to the
executor (`pgExecuteRaw` / `pgTransaction`). Unlike `PgRepository` it returns the full result shape —
`{ rows, rowCount, descriptor }` — so callers also get the JSON `QueryDescriptor` of each query.

## `PgModelClient`

```ts
class PgModelClient<T extends QueryResultRow = Record<string, unknown>, Cols extends string = string>
  implements PgModelClientLike<T, Cols> {
  readonly accessor: ModelAccessor<Cols>;
  readonly _pool: Pool;
  readonly _conn: Pool | PoolClient;   // execution target
  readonly _logger: QueryLogger | undefined;

  constructor(model: ModelDefinition, pool: Pool, conn?: PoolClient, logger?: QueryLogger)
}
```

- `accessor` is `new ModelAccessor<Cols>(model)` — the pure SQL/JSON factory.
- `_pool` is always the pool (used to start transactions); `_conn` is the actual execution target
  (`conn ?? pool`). Passing a `PoolClient` as `conn` makes the client transactional.
- It can be used **standalone** (no entity manager): `new PgModelClient(User, pool)`.

### Methods

| Method | Returns | Delegates to |
| --- | --- | --- |
| `findMany(options = {})` | `PgSelectResult<T>` | `executeFindMany` (ops/find/many.ts) |
| `findOne(options = {})` | `PgSelectResult<T>` | `executeFindOne` (ops/find/one.ts) |
| `create(options)` | `PgInsertResult<T>` | `executeCreate` (ops/mutate/create.ts) |
| `createMany(options)` | `PgInsertResult<T>` | `executeCreateMany` (ops/mutate/createMany.ts) |
| `update(options)` | `PgUpdateResult<T>` | `executeUpdate` (ops/mutate/update.ts) |
| `delete(options)` | `PgDeleteResult<T>` | `executeDelete` (ops/mutate/delete.ts) |
| `upsert(options)` | `PgInsertResult<T>` | `executeUpsert` (ops/mutate/upsert.ts) |
| `transaction<R>(cb)` | `Promise<R>` | `executeTransaction` (ops/transaction.ts) |
| `withClient(client)` | `PgModelClient<T,Cols>` | Returns a new client bound to `client`. |

> The client exposes `findMany/findOne/create/createMany/update/delete/upsert/transaction`. There is
> no `upsertMany` on the client even though the *accessor* has one (`ModelAccessor.upsertMany`); reach
> through `client.accessor.upsertMany(...)` if you need bulk upsert SQL.

## The `ops/*` execute wrappers

Every operation file follows the same three-line shape. Example (`ops/find/many.ts`):

```ts
export async function executeFindMany<T, Cols>(client, options = {}): Promise<PgSelectResult<T>> {
  const { sql, json } = client.accessor.findMany(options);             // 1. build SQL + JSON
  const { rows, rowCount } = await pgExecuteRaw<T>(client._conn, sql, client._logger); // 2. execute
  return { rows, rowCount, descriptor: json as SelectDescriptor };     // 3. attach descriptor
}
```

The mutate wrappers (`create`, `createMany`, `update`, `delete`, `upsert`) are identical except for the
accessor method called and the descriptor type cast. This keeps the client a thin, uniform adapter:
**build via accessor → run via executor → return rows + descriptor.**

## `withClient` and `executeTransaction`

```ts
withClient(client: PoolClient): PgModelClient<T, Cols> {
  return new PgModelClient((this.accessor as any)._model, this._pool, client, this._logger);
}
```

`withClient` rebuilds the client against a specific `PoolClient` (reusing `accessor._model`, the pool,
and logger). It's how a transaction binds the same model to a transaction connection.

```ts
// ops/transaction.ts
export async function executeTransaction(client, callback) {
  return pgTransaction(client._pool, async (conn) => {
    const tx = client.withClient(conn);   // same model, transaction connection
    return callback(tx);
  }, client._logger);
}
```

So `client.transaction(async tx => { await tx.create(...); await tx.update(...); })` runs every
statement on one transaction connection (BEGIN/COMMIT/ROLLBACK handled by `pgTransaction` — see
[executor.md](./executor.md)). This is the client-level transaction, distinct from the entity-manager's
`em.transaction(...)`, which uses `TransactionManager`/`TransactionContext`.

## Result shapes (`src/types/results.ts`)

```ts
interface PgSelectResult<T> { rows: T[]; rowCount: number; descriptor: SelectDescriptor }
interface PgInsertResult<T> { rows: T[]; rowCount: number; descriptor: InsertDescriptor | UpsertDescriptor }
interface PgUpdateResult<T> { rows: T[]; rowCount: number; descriptor: UpdateDescriptor }
interface PgDeleteResult<T> { rows: T[]; rowCount: number; descriptor: DeleteDescriptor }
type PgQueryResult<T> = PgSelectResult<T> | PgInsertResult<T> | PgUpdateResult<T> | PgDeleteResult<T>;
```

`create`/`createMany`/`upsert` all return `PgInsertResult` (the descriptor is `InsertDescriptor` for
inserts, `UpsertDescriptor` for upserts — the union covers both).

## `PgModelClientLike` (client/types.ts)

The interface the `ops/*` functions actually depend on — `{ accessor, _pool, _conn, _logger, withClient }`.
Coding the ops against this interface (rather than the concrete class) keeps them decoupled and makes
`withClient` the single seam for transaction binding.

## Edge cases & gotchas

- `findOne` adds `LIMIT 1` (in the accessor) and `FindOneOptions` omits `limit`/`offset` at the type
  level.
- A standalone `PgModelClient` constructed with only a pool runs each statement on a pooled connection;
  use `client.transaction(...)` to group them.
- The descriptor is always present on results — useful for building cache keys or logging without
  re-parsing SQL.

## Extending safely

- New operations should follow the `ops/*` three-step shape and return a `Pg*Result` with the matching
  descriptor — don't execute inline in `base.ts`.
- If you add a client method, back it with an accessor method so the SQL stays in the pure layer.
- Keep `_conn` as the only execution target; routing around it would break transaction binding.
