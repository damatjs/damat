# Connection lifecycle — `ConnectionManager`

Source: [`src/index.ts`](../src/index.ts). This document covers the stateful core of the package.

## Responsibility

`ConnectionManager` owns a single `pg` `Pool` and its full lifecycle: lazy creation, idempotent
connection, verification, health checks, client/stat access, and teardown. It is the only class that
holds mutable state; all SQL building and transactions live above it in `@damatjs/orm-pg`.

## Internal state

```ts
class ConnectionManager {
  private pool: Pool | null = null; // null until connect()
  private config: DbPoolConfigWithExtras; // immutable after construction
  private logger?: ILogger | undefined; // optional; enables event logging
  private isConnectedFlag: boolean = false; // true after a verified connection
  private connectionPromise: Promise<Pool> | null = null; // in-flight connect, for idempotency
}
```

## Constructor

```ts
constructor(config: DbPoolConfigWithExtras, logger?: ILogger)
```

Stores the config and optional logger. Performs **no** I/O — `isInitialized()` returns `false` until
`connect()` succeeds. This makes construction cheap and side-effect-free (the manager can be created
in DI containers before the database is reachable).

## Methods

### `connect(): Promise<Pool>` (idempotent)

```ts
async connect(): Promise<Pool> {
  if (this.pool && this.isConnectedFlag) return this.pool;     // already connected
  if (this.connectionPromise) return this.connectionPromise;   // connect in flight
  this.connectionPromise = this._createPool();
  return this.connectionPromise;
}
```

Three cases, in order:

1. Already connected → return the existing pool immediately.
2. A connect is in flight → return the same promise (so N concurrent callers share one pool).
3. Otherwise → start `_createPool()` and cache its promise.

> **Gotcha:** `connectionPromise` is only cleared on `disconnect()`. If `_createPool()` rejects, the
> rejected promise is still cached until a `disconnect()` runs. Call `disconnect()` (safe even when
> never connected) before retrying after a failed connect.

### `_createPool(): Promise<Pool>` (private)

Step by step:

1. `this.pool = new Pool(this.config)`.
2. If a logger was provided, `setupPoolListeners(this.pool, this.logger)` attaches event logging.
3. Acquire one client (`await this.pool.connect()`) to **prove** the database is reachable.
4. On success: set `isConnectedFlag = true`, log info, release the client, return the pool.
5. On failure: log the error and throw `new ConnectionError("Failed to connect to PostgreSQL: …", err)`
   wrapping the original error as `cause`.

The probe-and-release pattern means `connect()` only resolves once a real connection has been
established, not merely once the `Pool` object exists.

### `disconnect(): Promise<void>`

- No-op if `pool` is null (safe to call when never connected — covered by tests).
- Otherwise `await this.pool.end()`, then reset `pool = null`, `isConnectedFlag = false`,
  `connectionPromise = null`.
- On `pool.end()` failure, throws `ConnectionError("Failed to disconnect: …", err)`.

Because all state is reset, a subsequent `connect()` builds a fresh pool — reconnection after
disconnect is supported and tested.

### `healthCheck(): Promise<ConnectionStatus>`

Delegates to `performHealthCheck(this.pool, connected => { this.isConnectedFlag = connected })`.
The callback lets the health check keep the manager's connected flag in sync with reality (e.g. if
the database went away after `connect()`). Returns `{ connected, poolStats, lastChecked }` and never
throws — see [pool-tools.md](./pool-tools.md).

### `getPool(): Pool`

Returns the pool or throws `ConnectionError("Not connected to database. Call connect() first.")`.
Use this to hand the pool to `PgEntityManager`.

### `getClient(): Promise<PoolClient>`

`return this.getPool().connect()` — borrows a client from the pool (throwing via `getPool()` if not
connected). **The caller must `client.release()`** to return it to the pool.

### `getPoolStats(): PoolStats`

Delegates to `fetchPoolStats(this.pool)`. Returns total, idle, active, and waiting
connection counts, or all zeros when not connected.

### `isInitialized(): boolean`

`this.pool !== null && this.isConnectedFlag` — true only after a verified connection, false after disconnect.

## State diagram

```
                 connect() (verified)
   ┌──────────┐ ───────────────────────► ┌───────────┐
   │ created  │                            │ connected │
   │ pool=null│ ◄─────────────────────── │ pool=Pool │
   └──────────┘     disconnect()          └───────────┘
        ▲                                       │
        │   _createPool() throws ConnectionError│ (probe fails)
        └───────────────────────────────────────┘
```

## Edge cases

- **Concurrent `connect()`**: all callers receive the same `Pool` via the cached `connectionPromise`.
- **`getPool()` / `getClient()` before `connect()`**: throw `ConnectionError`.
- **`disconnect()` before `connect()`**: resolves to `undefined` (no-op).
- **Health check after the DB drops**: returns `connected: false` and flips `isConnectedFlag` to false.
- **Leaked clients**: `getClient()` does not auto-release; forgetting `release()` exhausts the pool
  (`waitingCount` climbs in `getPoolStats()`).
