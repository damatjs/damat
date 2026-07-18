# @damatjs/orm-connector

> PostgreSQL connection and pool manager for Damat — owns the `pg` Pool lifecycle, health checks, and pool stats.

`@damatjs/orm-connector` is the lowest layer of Damat's ORM stack. It wraps node-postgres's `Pool`
into a small `ConnectionManager` class that handles connect/disconnect, idempotent connection,
health checks, pool statistics, and structured logging of pool events. Everything above it
(`@damatjs/orm-pg`, `@damatjs/service`, `@damatjs/framework`) consumes the `Pool` it produces —
this package never builds SQL or knows about models; it only manages the database connection.

Part of the [Damat](../../../README.md) monorepo · [Full guide](../../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

```bash
bun add @damatjs/orm-connector
```

Inside the Damat monorepo this package is referenced with the workspace protocol — `"@damatjs/orm-connector": "*"` in a dependent's `package.json` — so the local source is always linked instead of a published version.

## When to use

Use this package when you need to:

- Own the `pg` Pool lifecycle directly (connect, disconnect, reconnect) with idempotent `connect()`.
- Run health checks (`SELECT 1`) and read live pool statistics for readiness/liveness probes.
- Get structured physical pool-event logging (connect / remove / error) through an `ILogger`.
- Produce a `Pool` to hand to `@damatjs/orm-pg`'s `PgEntityManager`.

Do **not** use it when:

- You want to build queries or use the Repository pattern — that's `@damatjs/orm-pg`.
- You only need the all-in-one ORM facade — depend on `@damatjs/orm-main` (re-exports this package plus `orm-pg`).
- You need per-request transactions / model accessors — those live in `@damatjs/orm-pg`.

## Quick start

```ts
import {
  ConnectionManager,
  productionPoolConfig,
} from "@damatjs/orm-connector";
import { Logger } from "@damatjs/logger";

const logger = new Logger({ prefix: "DB", timestamp: true });

const manager = new ConnectionManager(
  productionPoolConfig({
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "secret",
    database: "app",
  }),
  logger, // optional — enables pool-event logging
);

// connect() is idempotent: concurrent / repeated calls return the same Pool.
const pool = await manager.connect();

// Readiness probe.
const status = await manager.healthCheck();
//   { connected: true, poolStats: { totalCount, idleCount, activeCount, waitingCount }, lastChecked: Date }

// Hand the pool to the ORM execution layer.
// import { PgEntityManager } from "@damatjs/orm-pg";
// const db = new PgEntityManager({ pool, logger });

// Borrow a raw client when you need one (remember to release it).
const client = await manager.getClient();
const { rows } = await client.query("SELECT now()");
client.release();

await manager.disconnect();
```

## API

Exported from the package root (`@damatjs/orm-connector`):

| Export                  | Kind     | Summary                                                                                                                             |
| ----------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `ConnectionManager`     | class    | Owns the `pg` Pool lifecycle: `connect`, `disconnect`, `healthCheck`, `getPool`, `getClient`, `getPoolStats`, `isInitialized`.      |
| `ConnectionError`       | class    | `Error` subclass thrown on connect/disconnect failures and when accessing the pool before `connect()`. Carries an optional `cause`. |
| `setupPoolListeners`    | function | `(pool, logger) => void` — logs physical `error`/`connect`/`remove` pool events without logging each checkout.                    |
| `performHealthCheck`    | function | `(pool, updateStatus) => Promise<ConnectionStatus>` — runs `SELECT 1` and reports connectivity + pool stats.                        |
| `fetchPoolStats`        | function | `(pool \| null) => PoolStats` — reads total/idle/waiting and derives active connections (zeros when null).                         |
| `productionPoolConfig`  | function | Pool config preset: `min 2`, `max 20`, 5s connect / 30s idle, `allowExitOnIdle: false`. Accepts overrides.                          |
| `developmentPoolConfig` | function | Pool config preset: `min 1`, `max 5`, 5s connect / 10s idle. Accepts overrides.                                                     |
| `testPoolConfig`        | function | Pool config preset: `min 0`, `max 2`, 2s connect / 1s idle. Accepts overrides.                                                      |

`ConnectionManager` is also re-exported by `@damatjs/orm-main`. The config presets come from `./tools/config` (re-exported by the package root).

Key types (defined in `@damatjs/orm-type`, re-used here):

| Type                     | Shape                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `DbPoolConfigWithExtras` | `DbPoolConfig & { allowExitOnIdle?: boolean }` — host/port/user/password/database/ssl/min/max/timeouts/`connectionString`. |
| `ConnectionStatus`       | `{ connected: boolean; poolStats: PoolStats; lastChecked: Date }`                                                          |
| `PoolStats`              | `{ totalCount: number; idleCount: number; activeCount: number; waitingCount: number }`                                    |

## How it fits

Runtime dependencies (`package.json`):

- `@damatjs/deps` — provides the `pg` `Pool` implementation (`@damatjs/deps/pg`).
- `@damatjs/orm-type` — `DbPoolConfigWithExtras`, `ConnectionStatus`, `PoolStats`, `Pool`, `PoolClient`.
- `@damatjs/logger` — the `ILogger` interface for pool-event logging.
- `@damatjs/types` — shared base types.

In-repo dependents:

- `@damatjs/orm-pg` (sibling execution layer — consumes the produced `Pool`).
- `@damatjs/orm-main` (re-exports `ConnectionManager` and presets).
- `@damatjs/service`, `@damatjs/module`, `@damatjs/framework` (wire the manager into the runtime).

## Documentation

- [Internals & maintainer docs](./docs/README.md)
- [Damat full guide](../../../docs/GUIDE.md)

## License

MIT
