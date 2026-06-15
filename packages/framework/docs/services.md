# Services (wiring)

Source: `src/services/` — `index.ts`, `logger.ts`, `database.ts`, `redis.ts`, `moduleService.ts`, `types.ts`.

## Responsibility

`initializeServices` brings up everything the app needs before the HTTP layer: the logger, the PostgreSQL pool (via `@damatjs/services` `PoolManager`), Redis, and the application modules. It returns the health checks `bootstrap` exposes and the shutdown handlers `entry` registers.

## `initializeServices(config, cwd?)` (`index.ts`)

```ts
async function initializeServices(config: AppConfig, cwd = process.cwd()): Promise<ServiceInstances>;

interface ServiceInstances {
  healthChecks?: { database?: HealthCheckFn; redis?: HealthCheckFn };
  shutdownHandlers: Array<{ name: string; handler: () => Promise<void> }>;
  modules?: Map<string, ModuleInstance<any>>;
}
```

Steps:

1. **Logger** — `initLogger(config.projectConfig.loggerConfig)` (default config if none).
2. **Database** — if `projectConfig.databaseUrl`:
   - `initDatabase(config.services?.database ?? { connectionString: databaseUrl }, logger, nodeEnv)`.
   - Set `healthChecks.database` to a real ping (`getConnectionManager()?.healthCheck()`, returns `{ status, latency, data }`).
   - Push a `database` shutdown handler (`closeDatabase()`).
   - Else, `healthChecks.database` returns `{ status: "not configured" }`.
3. **Redis** — if `projectConfig.redisUrl`:
   - `initRedis({ url: services?.redis?.url ?? redisUrl, logger })` then `connectRedis()`.
   - Push a `redis` shutdown handler (`disconnectRedis()`).
   - Set `healthChecks.redis` to a real ping (`getRedis().ping()`); else `{ status: "not configured" }`.
4. **Modules** — if `config.modules` has entries: `initModules(Object.values(config.modules), cwd)` then `instances.modules = getAllModules()`.
5. Always push a `logger` shutdown handler (`closeLogger()`), registered last.

`bootstrap` wraps `instances.healthChecks` as `{ version: "2.0.0", checks }` for the `/health` route; `entry` `registerShutdown`s every handler.

## Logger (`logger.ts`)

Module-global singleton from `@damatjs/logger`.

| Function | Behaviour |
| --- | --- |
| `initLogger(config?)` | Creates the logger once (default: `level: "info"`, `format: "pretty"`, `timestamp: true`, `prefix: "damat"`); returns the existing one on subsequent calls. |
| `getLogger()` | Returns the logger, lazily calling `initLogger()` if none. |
| `setGlobalLoggerInstance(logger)` | Replaces the singleton (used in tests). |
| `clearGlobalLogger()` / `closeLogger()` | Reset / close + reset. |
| `isLoggerConfigured()` | Whether a logger exists. |
| `createContextLogger(context)` | A child logger bound to `context` (falls back to `NOOP_LOGGER.child` if none). |

> Test note: `tests/services/logger.test.ts` shows that after `setGlobalLoggerInstance(null)`, `getLogger()` throws `"Logger not initialized. Call initLogger() first."` — i.e. forcing the singleton to `null` is treated as "not initialized" by the underlying logger.

## Database (`database.ts`)

Bridges config to `@damatjs/services` `PoolManager`.

| Function | Behaviour |
| --- | --- |
| `initDatabase(dbConfig, logger, nodeEnv)` | Lazily creates a `ConnectionManager` (with env-appropriate pool config), `connect()`s to get a `Pool`, then `PoolManager.setup({ pool, logger, connectionManager })`. Returns the pool. |
| `getConnectionManager()` | The module-level `ConnectionManager` or `null`. |
| `checkHealth()` | `connectionManager.healthCheck()` or `null`. |
| `closeDatabase()` | `connectionManager.disconnect()`, null it, and `PoolManager.reset()`. |

`getPoolConfigByEnv(nodeEnv, config)`: if the config already has advanced pool settings (`min/max/idleTimeoutMillis/connectionTimeoutMillis`), use it verbatim; otherwise merge env defaults from `@damatjs/orm-connector` (`developmentPoolConfig`/`productionPoolConfig`/`testPoolConfig`) under the provided `config`.

## Redis (`redis.ts`)

```ts
export * from "@damatjs/redis";
```

A pure re-export. Provides `initRedis`, `connectRedis`, `getRedis`, `getRedisClient`, `hasRedis`, `disconnectRedis`, `checkRateLimit`, and the `RedisConfig`/`RedisClientConfig` types. The rate-limit middleware imports `hasRedis`/`getRedis`/`checkRateLimit` from here; `initializeServices` uses `initRedis`/`connectRedis`/`getRedis`/`disconnectRedis`. The Redis client itself is a module-global singleton inside `@damatjs/redis`.

## Module registry (`moduleService.ts`)

The app-side registry of running module services.

```ts
const moduleRegistry = new Map<string, ModuleInstance<any>>();

function registerModule(name, module): void;            // module.init(); set in map
function getModule<K extends keyof ModuleRegistry>(name: K): ModuleRegistry[K] | null;
function getModule<T>(name: string): T | null;          // explicit-type overload
function hasModule(name): boolean;
function clearModules(): void;
function getAllModules(): Map<string, ModuleInstance<any>>;
async function initModules(modules: ModuleConfig[], cwd): Promise<void>;
```

- **`registerModule(name, module)`** calls `module.init()` (constructs the service against the now-initialized pool) before storing it.
- **`getModule(name)`** returns the registered instance's `.service` (or `null`). Typed via the augmentable `ModuleRegistry` (from `@damatjs/services`); without augmentation, use `getModule<UserModuleService>("user")`.
- **`initModules(modules, cwd)`** for each `ModuleConfig`: resolves `cwd + resolve` to a `file://` URL, dynamic-imports it, takes the **default export**, requires it to have an `init` function (else throws "must default-export the result of defineModule()"), derives `id` from `config.id ?? basename(resolve)`, and `registerModule`s it.

## `ServiceInstances` (`types.ts`)

```ts
interface ServiceInstances {
  healthChecks?: { database?: HealthCheckFn; redis?: HealthCheckFn };
  shutdownHandlers: Array<{ name: string; handler: () => Promise<void> }>;
  modules?: Map<string, ModuleInstance<any>>;
}
```

## Gotchas

- **Order is enforced here.** The pool is set up (`initDatabase` → `PoolManager.setup`) before modules are initialized (`initModules` → `init()` → service construction, which requires the pool). Don't reorder these steps.
- **No DB / no Redis is a valid config.** Omitting `databaseUrl`/`redisUrl` skips that subsystem; health reports `"not configured"` and rate limiting is disabled.
- **Health-check `database` placeholder.** `initializeServices` first sets a stub `database`/`redis` health check (status `"Ideal"`) and then overwrites it with the real one when configured. The stub is never user-visible if a DB is configured.
- **Module default export must be a `defineModule` result.** Anything else throws during `initModules`.
- **Redis surface comes entirely from `@damatjs/redis`.** Document/extend Redis behaviour there, not here — this file is a one-line re-export.
