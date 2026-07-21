# @damatjs/orm-connector — Internals

Maintainer-facing documentation for the PostgreSQL connection/pool manager. For the
consumer-facing overview see the [package README](../README.md).

## Purpose

This package has exactly one job: turn a `DbPoolConfigWithExtras` into a live, observable
node-postgres `Pool` and manage its lifecycle. It does not build SQL, know about models, or run
transactions — that is `@damatjs/orm-pg`'s responsibility. Keeping it this thin means the rest of
the stack depends only on a plain `Pool`.

## Module map

| File                     | Responsibility                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`           | Defines `ConnectionManager`; re-exports `./tools/*` and `./tools/config`. The package's public surface.                |
| `src/tools/index.ts`     | Barrel re-exporting `error`, `listeners`, `status`.                                                                    |
| `src/tools/error.ts`     | `ConnectionError` — `Error` subclass with an optional `cause`.                                                         |
| `src/tools/listeners.ts` | `setupPoolListeners(pool, logger)` — wires pool lifecycle events to the logger.                                        |
| `src/tools/status.ts`    | `fetchPoolStats(pool)` and `performHealthCheck(pool, updateStatus)`.                                                   |
| `src/tools/config.ts`    | `productionPoolConfig` / `developmentPoolConfig` / `testPoolConfig` presets.                                           |
| `src/tests/**`           | Bun tests; require a reachable Postgres (`DATABASE_URL`, default `postgres://postgres:Password@0.0.0.0:5432/damatjs`). |

## Architecture overview

```
DbPoolConfigWithExtras ──► ConnectionManager ──► pg.Pool ──► (handed to @damatjs/orm-pg)
                                  │
                                  ├─ setupPoolListeners(pool, logger)   [tools/listeners]
                                  ├─ performHealthCheck(pool, cb)       [tools/status]
                                  ├─ fetchPoolStats(pool)               [tools/status]
                                  └─ ConnectionError on failure         [tools/error]
```

`ConnectionManager` is the only stateful piece. The `tools/*` functions are pure/stateless helpers
it delegates to, which keeps them independently unit-testable (the tests call `setupPoolListeners`,
`fetchPoolStats`, and `performHealthCheck` directly against a raw `Pool`).

## Control flow

1. `new ConnectionManager(config, logger?)` stores config + logger. No I/O — `isInitialized()` is `false`.
2. `connect()` lazily creates the pool via `_createPool()`, which:
   - constructs `new Pool(config)`,
   - calls `setupPoolListeners(pool, logger)` when a logger is present,
   - acquires one client to verify connectivity, then releases it and sets `isConnectedFlag = true`.
     The in-flight promise is cached so concurrent/repeat calls share one pool (idempotency).
3. `healthCheck()` delegates to `performHealthCheck`, which runs `SELECT 1` and updates the connected flag.
4. `disconnect()` ends the pool and resets all internal state so the manager can reconnect later.

See [connection-lifecycle.md](./connection-lifecycle.md) for the detailed lifecycle and
[pool-tools.md](./pool-tools.md) for the helper functions and config presets.

## Key invariants & design decisions

- **Idempotent connect.** `connect()` returns the existing pool if already connected, and otherwise
  returns the single in-flight `connectionPromise`. Two concurrent callers therefore receive the
  same `Pool` — verified by the "idempotent — multiple calls return same pool" test.
- **Connectivity is proven, not assumed.** `_createPool()` acquires and releases a real client before
  reporting success. A pool that constructs but cannot reach Postgres surfaces as a `ConnectionError`.
- **Fail loud on misuse.** `getPool()` / `getClient()` throw `ConnectionError("Not connected…")`
  if called before `connect()`. Stats and health checks instead degrade gracefully (zeros / `connected: false`).
- **Logging is optional.** The logger is only attached when supplied; without it the manager is silent
  and `setupPoolListeners` is never called.
- **State resets on disconnect.** After `disconnect()`, `pool`, `isConnectedFlag`, and `connectionPromise`
  are cleared so a later `connect()` builds a fresh pool.

## Extending safely

- **New pool presets:** add to `src/tools/config.ts` following the existing pattern (spread `overrides`
  last so callers can override every field, including the preset's own keys).
- **New pool events / log lines:** extend `setupPoolListeners`; keep them at `debug` level except real
  errors (`error`), matching the current convention.
- **Richer health checks:** extend `performHealthCheck`, but preserve its contract — always return a
  `ConnectionStatus` (never throw) and always call `updateStatus(connected)` so the manager's flag stays correct.
