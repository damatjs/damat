# Pool tools — listeners, status, errors & config presets

The `src/tools/` directory holds the stateless helpers that `ConnectionManager` delegates to, plus
the connection-error type and the pool-config presets. Each is independently unit-tested.

## `tools/error.ts` — `ConnectionError`

```ts
export class ConnectionError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "ConnectionError";
  }
}
```

- `name` is fixed to `"ConnectionError"` so callers can branch on it.
- `cause` carries the original driver error when wrapping (e.g. connect/disconnect failures).
- It is a plain `Error` subclass, so `instanceof Error` and `instanceof ConnectionError` both hold
  (verified in `tests/tools/error.test.ts`).

Thrown by `ConnectionManager` from `_createPool()` (connect failure), `disconnect()` (teardown
failure), and `getPool()` (used before `connect()`).

## `tools/listeners.ts` — `setupPoolListeners`

```ts
export function setupPoolListeners(pool: Pool, logger: ILogger): void;
```

Registers three listeners on the pool:

| Event     | Level   | Message                                                 |
| --------- | ------- | ------------------------------------------------------- |
| `error`   | `error` | `"PostgreSQL pool error"` with `{ error: err.message }` |
| `connect` | `debug` | `"New client connected to pool"`                        |
| `remove`  | `debug` | `"Client removed from pool"`                            |

Notes / gotchas:

- Called by `ConnectionManager._createPool()` only when a logger was supplied — without a logger the
  pool emits no log lines.
- The `error` listener is important: an unhandled `error` event on a `pg` `Pool` can crash the
  process. Attaching this listener makes pool errors observable instead of fatal.
- Routine checkout/release events are intentionally not logged. Aggregate pool
  statistics expose usage without producing a log line per query.

## `tools/status.ts` — health checks & stats

### `fetchPoolStats(pool: Pool | null): PoolStats`

```ts
{
  (totalCount, idleCount, activeCount, waitingCount);
} // all default to 0
```

Returns `{ 0, 0, 0 }` when `pool` is `null`, and coalesces any `undefined` counters to `0`
(`pool.totalCount ?? 0`). Pure and synchronous — safe to call at any time.

- `totalCount` — clients currently in the pool (idle + in-use).
- `idleCount` — clients available to be acquired.
- `activeCount` — derived as `max(0, totalCount - idleCount)`.
- `waitingCount` — pending acquire requests (a rising value signals pool exhaustion / leaked clients).

### `performHealthCheck(pool, updateStatus): Promise<ConnectionStatus>`

```ts
async function performHealthCheck(
  pool: Pool | null,
  updateStatus: (connected: boolean) => void,
): Promise<ConnectionStatus>;
```

Behaviour:

1. Snapshot `fetchPoolStats(pool)` and `now = new Date()`.
2. If `pool` is `null` → return `{ connected: false, poolStats, lastChecked: now }` (does **not** call `updateStatus`).
3. Otherwise acquire a client, run `SELECT 1`, release it:
   - success → `updateStatus(true)`, return `{ connected: true, poolStats: <fresh>, lastChecked: now }`.
   - failure → `updateStatus(false)`, return `{ connected: false, poolStats: <pre-check snapshot>, lastChecked: now }`.

Key contract: **never throws.** Connectivity failures are reported as `connected: false`, which is what
makes it safe to wire into a readiness/liveness probe. `ConnectionManager.healthCheck()` passes a
callback that writes `connected` back into `isConnectedFlag`, keeping the manager's state honest.

> **Gotcha:** on the `null`-pool path `updateStatus` is _not_ invoked, so the manager's flag is left
> untouched (it is already false in that scenario). On the live-pool paths it is always invoked.

## `tools/config.ts` — pool-config presets

Three factory functions returning `DbPoolConfigWithExtras`; each merges caller `overrides` last:

| Preset                  | `min` | `max` | `connectionTimeoutMillis` | `idleTimeoutMillis` | extra                    |
| ----------------------- | ----- | ----- | ------------------------- | ------------------- | ------------------------ |
| `productionPoolConfig`  | 2     | 20    | 5000                      | 30000               | `allowExitOnIdle: false` |
| `developmentPoolConfig` | 1     | 5     | 5000                      | 10000               | —                        |
| `testPoolConfig`        | 0     | 2     | 2000                      | 1000                | —                        |

```ts
productionPoolConfig({ host, port, user, password, database });
// → { min: 2, max: 20, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000,
//     allowExitOnIdle: false, host, port, user, password, database }
```

Because `...overrides` is spread last, a caller can override any preset field (including `min`/`max`).
Connection details (`host`/`port`/`user`/`password`/`database` or `connectionString`) are passed
through `overrides` — the presets only set sizing/timeout defaults.

## Testing notes

The integration-style tests (`tests/index.test.ts`, `tests/tools/listeners.test.ts`,
`tests/tools/status.test.ts`) connect to a real Postgres. They read `DATABASE_URL` and fall back to
`postgres://postgres:Password@0.0.0.0:5432/damatjs`. `tests/tools/error.test.ts` is pure and needs no
database. Run with `bun test ./src/**/*.test.ts` (the package's `test` script).
