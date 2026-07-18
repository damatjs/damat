# Services (wiring)

Source: `src/services/` — `index.ts`, shared service adapters, and
`initialize/` stages for database, Redis, modules, auth, durability, wakeups,
jobs, and durable events.

## Responsibility

`initializeServices` brings up the shared application layer before optional HTTP:
logger, PostgreSQL, Redis, modules/providers, auth/publishers, durable readiness,
and the workers selected by the resolved runtime. It returns health checks and
phased shutdown registrations.

## `initializeServices(config, cwd?)` (`index.ts`)

```ts
async function initializeServices(
  config: AppConfig,
  cwd = process.cwd(),
  runtime = resolveRuntime(config, {}),
): Promise<ServiceInstances>;

interface ServiceInstances {
  healthChecks?: { database?: HealthCheckFn; redis?: HealthCheckFn };
  shutdownHandlers: ShutdownRegistration[];
  modules?: Map<string, ModuleInstance<any>>;
  resolvedModules?: Map<string, ResolvedModule>;
  auth?: AuthRuntime;
  durabilityCoordinator?: DurabilityCoordinator;
}
```

Steps:

1. **Logger** — `initLogger(config.projectConfig.loggerConfig)` reuses the
   configured logger already created by `entry.start` (or creates it for direct
   `initializeServices` callers).
2. **Database** — if `projectConfig.databaseUrl`:
   - `initDatabase(config.services?.database ?? { connectionString: databaseUrl }, logger, nodeEnv)`.
   - Set `healthChecks.database` to a real ping (`getConnectionManager()?.healthCheck()`, returns `{ status, latency, data }`).
   - Register `closeDatabase()` in the `postgres` shutdown phase.
   - Else, `healthChecks.database` returns `{ status: "not configured" }`.
3. **Redis** — if `projectConfig.redisUrl`:
   - `initRedis({ url: services?.redis?.url ?? redisUrl, logger })` then `connectRedis()`.
   - Register `disconnectRedis()` in the `redis` shutdown phase.
   - Set `healthChecks.redis` to a real ping (`getRedis().ping()`); else `{ status: "not configured" }`.
4. **Modules + links + providers** — initialize app/link modules, load their
   workflow/job/event/pipeline providers, expose resolved modules, and install
   the link resolver.
5. **Auth and event broadcast** — initialize the configured auth adapter and
   Redis event broadcast. Their shutdown registrations stop new external work
   in the `claims` phase.
6. **Durable readiness** — when jobs or durable events are enabled, create the
   global durability client from `PoolManager.getPool()` and verify shared plus
   capability-specific system migrations. Missing database config fails startup.
   Missing migrations fail with `Run: damat-orm migrate:up` guidance.
7. **Durability acceleration** — create one coordinator, subscriber transport,
   transactional-outbox relay, Redis projection rebuild, and publisher gate per
   process. Capability failure disables both durable publishers/subscribers,
   activates PostgreSQL fallback, and retries with bounded backoff.
8. **Selected workers** — start only capabilities in `runtime.workers`:
   `JobWorker` for jobs, and `DurableEventRouter` + `DurableEventWorker` for
   events. Definitions are already loaded. In `worker` and `all` modes,
   selecting an unavailable capability fails visibly.
9. **Logger shutdown** — register `closeLogger()` in the final `logger` phase.

`server` resolves no workers, `worker` starts selected workers without HTTP,
and `all` may start workers and HTTP. Worker stop methods stage their own claim
stop, graceful drain, and maintenance/reconciliation cleanup and are registered
once in the framework's `claims` phase. Because `server` never executes
workers, it drops known worker selections without validating their service
availability; unknown capability names remain invalid in every mode.

`bootstrap` wraps `instances.healthChecks` as `{ version: "2.0.0", checks }` for the `/health` route; `entry` `registerShutdown`s every handler.

## Logger (`logger.ts`)

Module-global singleton from `@damatjs/logger`.

| Function                                | Behaviour                                                                                                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initLogger(config?)`                   | Creates the logger once (default: `level: "info"`, `format: "pretty"`, `timestamp: true`, `prefix: "damat"`); returns the existing one on subsequent calls. |
| `getLogger()`                           | Returns the logger, lazily calling `initLogger()` if none.                                                                                                  |
| `setGlobalLoggerInstance(logger)`       | Replaces the singleton (used in tests).                                                                                                                     |
| `clearGlobalLogger()` / `closeLogger()` | Reset / close + reset.                                                                                                                                      |
| `isLoggerConfigured()`                  | Whether a logger exists.                                                                                                                                    |
| `createContextLogger(context)`          | A child logger bound to `context` (falls back to `NOOP_LOGGER.child` if none).                                                                              |

> Test note: `tests/services/logger.test.ts` shows that after `setGlobalLoggerInstance(null)`, `getLogger()` throws `"Logger not initialized. Call initLogger() first."` — i.e. forcing the singleton to `null` is treated as "not initialized" by the underlying logger.

## Database (`database.ts`)

Bridges config to `@damatjs/services` `PoolManager`.

| Function                                  | Behaviour                                                                                                                                                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initDatabase(dbConfig, logger, nodeEnv)` | Lazily creates a `ConnectionManager` (with env-appropriate pool config), `connect()`s to get a `Pool`, then `PoolManager.setup({ pool, logger, connectionManager })`. Returns the pool. |
| `getConnectionManager()`                  | The module-level `ConnectionManager` or `null`.                                                                                                                                         |
| `checkHealth()`                           | `connectionManager.healthCheck()` or `null`.                                                                                                                                            |
| `closeDatabase()`                         | `connectionManager.disconnect()`, null it, and `PoolManager.reset()`.                                                                                                                   |

`getPoolConfigByEnv(nodeEnv, config)`: if the config already has advanced pool settings (`min/max/idleTimeoutMillis/connectionTimeoutMillis`), use it verbatim; otherwise merge env defaults from `@damatjs/orm-connector` (`developmentPoolConfig`/`productionPoolConfig`/`testPoolConfig`) under the provided `config`.

`PoolManager.getPool()` is the only pool handed to modules, HTTP work,
durability clients, workers, inspection, and maintenance. Worker loops never
construct a pool or direct PostgreSQL connection.

## Redis (`redis.ts`)

```ts
export * from "@damatjs/redis";
```

A pure re-export. Provides `initRedis`, `connectRedis`, `getRedis`, `getRedisClient`, `hasRedis`, `disconnectRedis`, `checkRateLimit`, and the `RedisConfig`/`RedisClientConfig` types. The rate-limit middleware imports `hasRedis`/`getRedis`/`checkRateLimit` from here; `initializeServices` uses `initRedis`/`connectRedis`/`getRedis`/`disconnectRedis`. The Redis client itself is a module-global singleton inside `@damatjs/redis`.

## Module registry (`moduleService.ts`)

The app-side registry of running module services.

```ts
const moduleRegistry = new Map<string, ModuleInstance<any>>();

function registerModule(name, module): void; // module.init(); set in map
function getModule<K extends keyof ModuleRegistry>(
  name: K,
): ModuleRegistry[K] | null;
function getModule<T>(name: string): T | null; // explicit-type overload
function hasModule(name): boolean;
function clearModules(): void;
function getAllModules(): Map<string, ModuleInstance<any>>;
async function initModules(modules: ModuleConfig[], cwd): Promise<void>;
```

- **`registerModule(name, module)`** calls `module.init()` (constructs the service against the now-initialized pool) before storing it.
- **`getModule(name)`** returns the registered instance's `.service` (or `null`). Typed via the augmentable `ModuleRegistry` (from `@damatjs/services`); without augmentation, use `getModule<UserModuleService>("user")`.
- **`initModules(modules, cwd)`** resolves string locations as project-relative
  file URLs, `{ type: "package", name }` as Node package specifiers, and
  `{ type: "damat", path }` inside `.damat/packages`. It then imports the
  default export, requires an `init` function, derives an id, and registers it.
- **Cross-module links register as a `link` module.** `initializeServices` appends the entries from `resolveLinkModuleEntries(config.links, cwd)` to the list it passes to `initModules`, so a link directory boots through the same path as any other module and `getModule("link")` returns the link service (`create`/`dismiss`/`fetch` plus a nested `graph` query). `setLinkModuleResolver` then lets that service call other modules' services by id.

## `ServiceInstances` (`types.ts`)

```ts
interface ServiceInstances {
  healthChecks?: { database?: HealthCheckFn; redis?: HealthCheckFn };
  shutdownHandlers: ShutdownRegistration[];
  modules?: Map<string, ModuleInstance<any>>;
  resolvedModules?: Map<string, ResolvedModule>;
  auth?: AuthRuntime;
}
```

## Gotchas

- **Order is enforced here.** The pool is set up (`initDatabase` → `PoolManager.setup`) before modules are initialized (`initModules` → `init()` → service construction, which requires the pool). Don't reorder these steps.
- **No DB / no Redis is valid until a dependent service is enabled.** Omitting
  either URL skips that subsystem and health reports `"not configured"`.
  Enabling jobs or durable events requires PostgreSQL. Redis event broadcast,
  rate limiting, and wakeups require Redis; durable polling does not.
- **Readiness precedes execution.** A job or durable-event worker cannot start
  until all required system migrations are present. Run
  `damat-orm migrate:up` before starting durable processes.
- **No operations routes are mounted here.** The framework root re-exports
  headless inspection and control clients; the application owns any HTTP layer.
- **Health-check `database` placeholder.** `initializeServices` first sets a stub `database`/`redis` health check (status `"Ideal"`) and then overwrites it with the real one when configured. The stub is never user-visible if a DB is configured.
- **Module default export must be a `defineModule` result.** Anything else throws during `initModules`.
- **Redis surface comes entirely from `@damatjs/redis`.** Document/extend Redis behaviour there, not here — this file is a one-line re-export.
