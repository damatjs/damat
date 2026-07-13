# Transactions

Sources: [`src/transaction/manager.ts`](../src/transaction/manager.ts),
[`src/transaction/context.ts`](../src/transaction/context.ts),
[`src/transaction/error.ts`](../src/transaction/error.ts).

This is the dedicated transaction layer used by `PgEntityManager.transaction(...)`. It is distinct from
the client-level transaction (`PgModelClient.transaction` → `pgTransaction`, see [executor.md](./executor.md)):

| Path                          | Driver                                      | Savepoints? | Isolation options?         |
| ----------------------------- | ------------------------------------------- | ----------- | -------------------------- |
| `em.transaction(cb)` / `tx.*` | `TransactionManager` + `TransactionContext` | yes         | yes (`TransactionOptions`) |
| `client.transaction(cb)`      | `pgTransaction` (executor)                  | no          | no                         |

## `TransactionManager`

```ts
class TransactionManager {
  constructor(pool: Pool, logger?: ILogger);
  begin(options?: TransactionOptions): Promise<TransactionContext>;
  run<R>(
    callback: (ctx) => Promise<R>,
    options?: TransactionOptions,
  ): Promise<R>;
}
```

`activeTransactions` is a `WeakMap<PoolClient, TransactionContext>` tracking live contexts (keyed by
client, so entries are GC'd with the client).

### `begin(options)`

1. Acquire a `PoolClient` from the pool.
2. Run `_beginTransaction(client, options)` (issues `BEGIN` and any `SET TRANSACTION …`).
3. Wrap the client in a `TransactionContext`, register it in `activeTransactions`, return it.
4. On any failure during setup, release the client and rethrow (no leaked connection).

### `run(callback, options)` — the workhorse

```ts
const ctx = await this.begin(options);
try {
  const result = await callback(ctx);
  await ctx.commit();
  return result;
} catch (error) {
  try { await ctx.rollback(); }
  catch (rollbackError) { this.logger?.error?.("Transaction rollback failed", …); } // original error preserved
  throw error;            // always rethrow the ORIGINAL error
} finally {
  ctx.release();          // always release the client back to the pool
}
```

Guarantees:

- **Commit on success, rollback on throw.**
- **A failing rollback never masks the original error** — it is logged, and the original error is
  rethrown.
- **The client is always released** (via `finally`), even if both callback and rollback fail.

`PgEntityManager.transaction` calls `run` and hands the `ctx` to a `TransactionalEntityManager`, so the
callback receives `tx.<model>` accessors bound to this transaction (see [entity-manager.md](./entity-manager.md)).

### `_beginTransaction` and isolation safety

```ts
const VALID_ISOLATION_LEVELS = new Set([
  "READ UNCOMMITTED",
  "READ COMMITTED",
  "REPEATABLE READ",
  "SERIALIZABLE",
]);
```

`TransactionOptions` (`@damatjs/orm-type`) is `{ isolationLevel?, readOnly?, deferrable? }`. The method:

1. If `isolationLevel` is set, **validate against the allow-list** (throws `Invalid transaction
isolation level: "…"` otherwise) and queue `SET TRANSACTION ISOLATION LEVEL <level>`.
2. If `readOnly` is set, queue `SET TRANSACTION READ ONLY|READ WRITE`.
3. If only `deferrable` is set (and neither `readOnly` nor `isolationLevel`), queue
   `SET TRANSACTION [NOT ]DEFERRABLE`.
4. Run `BEGIN`, then each queued statement in order.

> **Why the allow-list:** the isolation level is the one place a value is interpolated directly into
> SQL (PostgreSQL has no parameter form for `SET TRANSACTION`). The set guards against injection from
> untyped config / JSON input. **Do not remove this check.**

> **Gotcha:** the `deferrable` statement is only emitted when `readOnly` and `isolationLevel` are both
> `undefined` (see the condition in `_beginTransaction`). `DEFERRABLE` only has an effect for
> `SERIALIZABLE READ ONLY` transactions in Postgres anyway.

## `TransactionContext`

```ts
class TransactionContext {
  constructor(client: PoolClient, logger?: ILogger);
  query<T>(sql, params?): Promise<{ rows: T[]; rowCount: number }>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  getClient(): PoolClient;
  createSavepoint(name): Promise<void>;
  rollbackToSavepoint(name): Promise<void>;
  releaseSavepoint(name): Promise<void>;
  release(): void;
  isActive(): boolean;
}
```

Internal flags: `_isActive` (set false after commit/rollback) and `isReleased` (set true after `release`).

| Method                                                         | Behaviour                                                                                                                                                                                          |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `query`                                                        | Runs SQL on the client; wraps failures in `TransactionError("Query failed: …")` (logs first 100 chars of SQL); throws `TransactionError("Transaction is not active")` if inactive.                 |
| `commit`                                                       | `COMMIT`; sets `_isActive=false`; throws `TransactionError("Commit failed: …")` on failure; throws if already inactive.                                                                            |
| `rollback`                                                     | `ROLLBACK`; sets `_isActive=false`. **No-op if already inactive** (so a manager-driven rollback after a failed commit is safe); throws `TransactionError("Rollback failed: …")` on driver failure. |
| `getClient`                                                    | Returns the client; throws if inactive.                                                                                                                                                            |
| `createSavepoint` / `rollbackToSavepoint` / `releaseSavepoint` | Issue `SAVEPOINT` / `ROLLBACK TO SAVEPOINT` / `RELEASE SAVEPOINT` via `_savepointOp`.                                                                                                              |
| `release`                                                      | Releases the client back to the pool once (idempotent via `isReleased`).                                                                                                                           |
| `isActive`                                                     | `_isActive && !isReleased`.                                                                                                                                                                        |

### Savepoint name sanitisation

```ts
private async _savepointOp(op, name) {
  if (!this._isActive) throw new TransactionError("Transaction is not active");
  const clean = name.replace(/[^a-zA-Z0-9_]/g, "_");  // strip anything non-identifier
  await this.client.query(`${op} ${clean}`);
}
```

Savepoint names are interpolated into SQL (no parameter form), so they are sanitised to
`[a-zA-Z0-9_]`. Note: the original (unsanitised) `name` is what gets logged, but the **sanitised**
name is used in SQL — so `rollbackToSavepoint("sp 1")` and `createSavepoint("sp_1")` both target
`sp_1`. Use identifier-safe names to avoid surprises.

## Errors (`transaction/error.ts`)

```ts
class TransactionError extends Error { constructor(message, cause?) … }       // name = "TransactionError"
class TransactionContextError extends Error { constructor(message) … }         // name = "TransactionContextError"
```

`TransactionError` is thrown for commit/rollback/query failures and inactive-transaction misuse;
it carries the underlying driver error as `cause`. (`TransactionContextError` is exported but not
currently thrown in these paths.)

## Edge cases & gotchas

- Using a context after `commit`/`rollback` throws `"Transaction is not active"`.
- `rollback` after commit is a no-op (not an error) — this is what makes `run`'s catch-block rollback safe.
- `release()` is idempotent; the manager always calls it in `finally`.
- Two savepoint names differing only in non-identifier chars collide after sanitisation.

## Extending safely

- Keep `VALID_ISOLATION_LEVELS` as the gate for any value interpolated into `SET TRANSACTION`.
- Preserve `run`'s contract: commit on success, rollback+log on failure, always release, always rethrow
  the original error.
- New context operations that interpolate identifiers must sanitise them the way `_savepointOp` does,
  or use parameters where possible.
