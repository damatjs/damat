# `PoolManager`

Source: `src/manager/pool.ts`.

## Responsibility

`PoolManager` is the **single, process-wide holder** of the PostgreSQL connection pool, the `PgEntityManager` built on top of it, and (optionally) a `ConnectionManager`. Generated services and `ModelMethods` read the entity manager from here; they never construct their own. It is a class with only static members and a private constructor — you never instantiate it.

## State on `globalThis`

The state is **not** stored in class statics. It lives on `globalThis` under a registered symbol:

```ts
const STATE_KEY = Symbol.for("damatjs.services.poolManager");

interface PoolManagerState {
  pool: Pool | null;
  entityManager: PgEntityManager | null;
  connectionManager: ConnectionManager | null;
}

function getState(): PoolManagerState {
  const holder = globalThis as Record<symbol, PoolManagerState | undefined>;
  if (!holder[STATE_KEY]) {
    holder[STATE_KEY] = {
      pool: null,
      entityManager: null,
      connectionManager: null,
    };
  }
  return holder[STATE_KEY];
}
```

The static getters/setters (`pool`, `entityManager`, `connectionManager`) proxy to `getState()`. **Why:** if two copies of `@damatjs/services` are loaded in the same process (e.g. a linked dev package next to an installed one), class statics would be per-copy and the second copy would believe the pool was never initialized. `Symbol.for(...)` is global, so both copies converge on one shared state object.

## API

| Method                 | Signature                                       | Behaviour                                                                                                                                                                                                                                                                     |
| ---------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setup`                | `({ pool, logger, connectionManager }) => void` | Stores the pool and connection manager, and constructs `new PgEntityManager({ pool, logger })`. Call once at startup.                                                                                                                                                         |
| `getPool`              | `() => Pool`                                    | Returns the pool; throws `"Pool not initialized..."` if unset.                                                                                                                                                                                                                |
| `getPgEntityManager`   | `() => PgEntityManager`                         | Returns the entity manager; throws `"EntityManager not initialized..."` if unset.                                                                                                                                                                                             |
| `getConnectionManager` | `() => ConnectionManagerLike \| null`           | Returns the connection manager or `null`.                                                                                                                                                                                                                                     |
| `setEntityManager`     | `(em: PgEntityManager) => void`                 | Replaces the entity manager (escape hatch / testing).                                                                                                                                                                                                                         |
| `isInitialized`        | `() => boolean`                                 | `pool !== null`. The `ModuleService` constructor guards on this.                                                                                                                                                                                                              |
| `hasEntityManager`     | `() => boolean`                                 | `entityManager !== null`.                                                                                                                                                                                                                                                     |
| `healthCheck`          | `() => Promise<boolean>`                        | If a connection manager exists, returns its `healthCheck().connected`; otherwise runs `SELECT 1 as ok` against the pool. Returns `false` on any failure (and `false` when uninitialized with no connection manager).                                                          |
| `getStats`             | `() => PoolManagerStats`                        | If a connection manager exists, maps `getPoolStats()`; otherwise reads `pool.totalCount/idleCount/waitingCount`. **Throws if the pool is not initialized and there is no connection manager** (it calls `getPool()`).                                                         |
| `reset`                | `() => void`                                    | Clears `pool`, `entityManager`, and `connectionManager` to `null`. Does **not** end the pool.                                                                                                                                                                                 |
| `close`                | `() => Promise<void>`                           | Drains and ends the pg pool, then clears all state. Idempotent: it calls `reset()` _before_ `pool.end()`, so a second `close()` (or a `close()` after `reset()`) is a no-op, and a pool someone else already ended is skipped via `pool.ended` (pg throws on double `end()`). |

```ts
interface PoolManagerStats {
  totalConnections: number;
  idleConnections: number;
  waitingCount: number;
}
interface ConnectionManagerLike {
  healthCheck(): Promise<ConnectionStatus>;
  getPoolStats(): PoolStats;
}
```

## Setup signature

```ts
static setup({ connectionManager, pool, logger }: {
  pool: Pool;
  logger: ILogger;
  connectionManager: ConnectionManager;
}): void
```

In the monorepo this is called by `@damatjs/framework`'s `initDatabase` (`packages/framework/src/services/database.ts`): it constructs a `ConnectionManager`, connects to get the `Pool`, then calls `PoolManager.setup({ pool, logger, connectionManager })`.

## Lifecycle

```
startup:   PoolManager.setup({ pool, logger, connectionManager })   // pool + entity manager ready
runtime:   PoolManager.getPgEntityManager()  // read by services / ModelMethods
shutdown:  connectionManager.disconnect(); PoolManager.reset()
           // or, when nothing else owns the pool: await PoolManager.close()
```

The framework's `closeDatabase()` disconnects the connection manager and calls `PoolManager.reset()` — the connection manager owns and ends the pool there. `close()` is the standalone path: when `PoolManager` holds the only reference (tests, scripts that called `setup` with a bare `pg.Pool`), it drains and ends the pool itself.

## Gotchas

- **`getStats()` can throw.** Unlike `healthCheck()` (which returns `false`), `getStats()` falls through to `getPool()` when there is no connection manager, which throws if the pool is uninitialized. The test suite asserts this (`tests/manager/pool.test.ts`).
- **`healthCheck()` returns `false`, never throws.** When uninitialized with no connection manager it returns `false`; the pool-path is wrapped in `try/catch`.
- **One pool per process.** This is intentional and shared globally. Do not try to run multiple independent pools through `PoolManager`; use the underlying `pg.Pool` directly if you need that.
- **`reset()` is for teardown / test isolation.** After `reset()`, services constructed earlier hold a `ModelMethods` bound to an entity manager that is now detached. `defineModule().init()` re-constructs services against the _current_ pool — call it again after a reset (the framework's module init does).
- **`reset()` drops references; `close()` ends the pool.** After a bare `reset()` the pool object keeps its connections alive — whoever created it must still `end()` it. Use `close()` when `PoolManager` is the last owner and you want the connections gone (`tests/manager/pool.close.test.ts` covers the idempotency cases).
