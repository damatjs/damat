# Executor

Sources: [`src/executor/raw.ts`](../src/executor/raw.ts),
[`src/executor/transaction.ts`](../src/executor/transaction.ts).

The executor is the thin seam between the pure query layer and the `pg` driver. It is the **only** place
in the package that calls `conn.query(...)` for builder-generated SQL, and the single point where query
logging happens. Everything above it (clients, repos, managers) routes through `pgExecuteRaw`.

## `pgExecuteRaw`

```ts
async function pgExecuteRaw<T extends QueryResultRow = Record<string, unknown>>(
  conn: Pool | PoolClient,
  query: BuiltQuery,          // { sql: string; params: unknown[] }
  logger?: QueryLogger,
): Promise<{ rows: T[]; rowCount: number }>
```

Step by step:

1. `loggerInstance = logger ?? getQueryLogger()` — falls back to the **global** `QueryLogger`
   (`@damatjs/orm-core`).
2. Record `startTime`, call `logger.logQuery(query.sql, query.params)`.
3. `result = await conn.query<T>(query.sql, query.params)`.
4. `logger.logSlowQuery(query.sql, Date.now() - startTime, query.params)` — warns if over the slow
   threshold (default 1000ms).
5. Return `{ rows: result.rows, rowCount: result.rowCount ?? result.rows.length }`.
6. On error: `logger.logQueryError(err, query.sql, query.params)` then **rethrow the original error**
   (it does not wrap it — wrapping happens higher up, e.g. `QueryExecutionError` in the manager's `raw`).

Key points:

- **Accepts both `Pool` and `PoolClient`.** Passing a `PoolClient` keeps the query inside whatever
  transaction that client is in — this is how transaction-bound clients/repos execute.
- **`rowCount` fallback.** `pg` can report `rowCount: null` for some statements; the fallback to
  `result.rows.length` keeps the count meaningful for `RETURNING` queries.
- **No error wrapping here.** Logging then rethrow — callers decide how to wrap.

## `pgTransaction`

```ts
async function pgTransaction<R>(
  pool: Pool,
  callback: (client: PoolClient) => Promise<R>,
  logger?: QueryLogger,
): Promise<R>
```

A minimal BEGIN/COMMIT/ROLLBACK helper used by the **client-level** transaction
(`PgModelClient.transaction` → `executeTransaction`):

```ts
const client = await pool.connect();
try {
  logger.logTransaction("begin");  await client.query("BEGIN");
  const result = await callback(client);
  await client.query("COMMIT");    logger.logTransaction("commit");
  return result;
} catch (err) {
  await client.query("ROLLBACK");  logger.logTransaction("rollback");
  throw err;
} finally {
  client.release();
}
```

Guarantees: commit on success, rollback on throw, client always released. The `callback` gets the raw
`PoolClient`; `executeTransaction` wraps it via `client.withClient(conn)` so the model client's methods
run on the transaction connection.

> **vs. `TransactionManager`:** `pgTransaction` is the lightweight path with **no** isolation options
> and **no** savepoints. For those, use `PgEntityManager.transaction` which goes through
> `TransactionManager`/`TransactionContext` (see [transactions.md](./transactions.md)).

> **Gotcha:** if `client.query("ROLLBACK")` itself throws inside the catch block, that error propagates
> instead of the original `err`. `TransactionManager.run` handles this case more carefully (it logs the
> rollback failure and rethrows the original error); `pgTransaction` does not.

## Logging (`QueryLogger`, `@damatjs/orm-core`)

`pgExecuteRaw`/`pgTransaction` log through a `QueryLogger`:

- `logQuery(sql, params)` — debug per query (when `logQueries`).
- `logSlowQuery(sql, duration, params)` — warns when `duration > slowQueryThreshold` (default 1000ms).
- `logQueryError(error, sql, params)` — error log on failure.
- `logTransaction("begin"|"commit"|"rollback")` — debug for client-level transactions.

The global logger (`getQueryLogger()`) is used when none is passed. Configure it process-wide via
`configureQueryLogger(options, logger?)` / `setQueryLogger(...)` from `@damatjs/orm-core` — e.g. to set
`slowQueryThreshold`, disable query logging, or attach a custom `ILogger`.

> **Note:** `PgRepository.count` / `exists` call `connection.query(...)` directly (not via
> `pgExecuteRaw`), so those two queries are **not** logged through the `QueryLogger`. Everything else in
> the CRUD path is.

## Extending safely

- Keep `pgExecuteRaw` as the single execution chokepoint for builder SQL — new operations should reach
  the driver through it so logging stays uniform.
- Don't wrap errors here; preserve "log then rethrow" so higher layers can classify failures.
- Preserve the `rowCount ?? rows.length` fallback for `RETURNING` correctness.
- If you need isolation/savepoints, route through `TransactionManager`, not `pgTransaction`.
