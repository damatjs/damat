# Repository

Sources: [`src/repository/repository.ts`](../src/repository/repository.ts),
[`src/repository/factory.ts`](../src/repository/factory.ts).

`PgRepository` is the ergonomic CRUD surface. Where `PgModelClient` returns
`{ rows, rowCount, descriptor }`, the repository unwraps those into plain rows / single rows / counts,
and adds convenience methods (`findById`, `count`, `exists`, …). One repository wraps one model.

## `createRepository` — the factory

```ts
function createRepository<T>(
  model: ModelDefinition,
  connection: Pool | PoolClient | { getPool: () => Pool },
  logger: ILogger,
  isInTransaction = false,
): PgRepository<T>
```

Connection resolution:

- If `connection` has a `getPool` method, it is unwrapped to `connection.getPool()` and
  `isInTransaction` is forced to `false` (it's a pool, not a transaction client).
- Otherwise the `Pool`/`PoolClient` is used as-is.

It then constructs `new PgRepository({ model, connection: conn, logger, isInTransaction })`.

Used by `PgEntityManager` (pool-bound, `isInTransaction = false`) and `TransactionalEntityManager`
(client-bound, `isInTransaction = true`).

## `PgRepository`

```ts
class PgRepository<T extends QueryResultRow = QueryResultRow, Cols extends string = string> {
  public readonly client: PgModelClient<T, Cols>;
  constructor(config: PgRepositoryConfig) // { model, connection, logger, isInTransaction? }
}
```

The constructor builds the underlying `PgModelClient(model, connection as Pool, connection as PoolClient)`.
The same `connection` is passed for both the pool and client slots; `PgModelClient` uses `_conn` for
execution, so passing a `PoolClient` makes the repo transactional and passing a `Pool` makes it pooled.

### Read methods

| Method | Returns | Notes |
| --- | --- | --- |
| `findMany(opt = {})` | `T[]` | `client.findMany(opt).rows`. |
| `findOne(opt = {})` | `T \| undefined` | `opt` excludes `limit`/`offset`; returns `rows[0]`. |
| `findById(id, opt = {})` | `T \| undefined` | `findOne({ ...opt, where: { id } })`. |
| `findManyByIds(ids, opt = {})` | `T[]` | `findMany({ ...opt, where: { id: { in: ids } } })`. |
| `count(where?)` | `number` | `SELECT COUNT(*) FROM (<findMany sql>) as subquery`; parses the count. |
| `exists(where)` | `boolean` | `SELECT EXISTS(<findOne sql>) as exists`. |

### Write methods

| Method | Returns | Notes |
| --- | --- | --- |
| `create(opt)` | `T` | Throws `"Failed to create record: no rows returned"` if no row comes back. |
| `createMany(opt)` | `T[]` | Bulk insert. |
| `update(opt)` | `T[]` | All updated rows. |
| `updateOne(set, where, returning?)` | `T \| undefined` | Convenience for `update({ set, where, returning }).rows[0]`. |
| `delete(opt)` | `number` | Returns `rowCount`. |
| `deleteById(id, returning?)` | `T \| undefined` | `delete({ where: { id }, returning }).rows[0]`. |
| `upsert(opt)` | `T` | Throws `"Upsert failed: no rows returned"` if no row comes back. |
| `upsertMany(opt)` | `T[]` | Bulk insert-or-update; all affected rows. |
| `getAccessor()` | `ModelAccessor` | Escape hatch to the underlying accessor. |

Option types (`FindOptions`, `CreateOptions`, `UpdateOptions`, `DeleteOptions`, `UpsertOptions`,
`UpsertManyOptions`, `CreateManyOptions`) are documented in [query-builder.md](./query-builder.md).

## `count` / `exists` — subquery wrapping

These two methods do not go through a builder method directly; they wrap the accessor's generated SQL:

```ts
async count(where?) {
  const { sql } = this.client.accessor.findMany({ select: [], where });
  const result = await this.connection.query<{ count: string }>(
    `SELECT COUNT(*) FROM (${sql.sql}) as subquery`, sql.params);
  return parseInt(result.rows[0]?.count || "0", 10);
}

async exists(where) {
  const { sql } = this.client.accessor.findOne({ where });
  const result = await this.connection.query<{ exists: boolean }>(
    `SELECT EXISTS(${sql.sql}) as exists`, sql.params);
  return result.rows[0]?.exists ?? false;
}
```

Notes / gotchas:

- `count` calls `findMany` with `select: []`, which produces `SELECT *` (empty column list ⇒ `*` in the
  builder) wrapped in a counting subquery — so the count is correct regardless of selected columns.
- `count`/`exists` run via `this.connection.query` directly (bypassing `pgExecuteRaw`), so they are
  **not** routed through the `QueryLogger`. If logging counts matters, that's a place to extend.
- The COUNT result comes back as a string (`bigint` text), hence the `parseInt`.

## Transactional vs pooled repositories

- **Pooled** (from `PgEntityManager`): `connection` is the `Pool`; each statement may use a different
  pooled connection. `isInTransaction = false`.
- **Transactional** (from `TransactionalEntityManager`): `connection` is the transaction's `PoolClient`;
  every statement runs in that one transaction. `isInTransaction = true`.

The `isInTransaction` flag is stored but not currently used to alter execution — the binding is what
matters (a `PoolClient` connection ⇒ transactional execution).

## Extending safely

- Add new convenience methods here (not on the managers) so both pooled and transactional repos inherit them.
- When unwrapping client results, mirror the existing pattern: read `.rows` / `.rows[0]` / `.rowCount`
  and throw a clear message when a `RETURNING` row is expected but absent (as `create`/`upsert` do).
- If you add a method that builds ad-hoc SQL (like `count`/`exists`), route it through `pgExecuteRaw`
  if you want it logged consistently with the rest of the layer.
