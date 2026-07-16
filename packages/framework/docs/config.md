# Config

Source: `src/config/` — `define.ts`, `loader.ts`, `types/`.

## Responsibility

Define and load the application configuration (`damat.config.ts`). `defineConfig` is an identity helper that gives you type-checking and inference; `loadConfigAsync` dynamically imports the config file at runtime and caches it.

## `defineConfig`

```ts
export function defineConfig(config: AppConfig): AppConfig {
  return config;
}
```

Pure identity — its only job is to attach the `AppConfig` type to your object literal so the editor checks it and infers field types. Used at the top of `damat.config.ts`.

## Loading

```ts
const CONFIG_FILE = "damat.config.ts";
let cachedConfig: AppConfig | null = null;

export function loadConfig(cwd?: string): AppConfig; // ALWAYS THROWS — see below
export async function loadConfigAsync(cwd?: string): Promise<AppConfig>;
export function clearConfigCache(): void;
```

- **`loadConfigAsync(cwd = process.cwd())`** — returns the cached config if present; otherwise resolves `<cwd>/damat.config.ts`, errors if it doesn't exist, then `await import()`s it (via a `file://` URL it builds itself, Windows-safe), takes `module.default || module`, requires a `projectConfig` field, caches, and returns it. Any failure is rethrown as `Failed to load config: <message>`.
- **`loadConfig(cwd?)`** — checks the file exists, then throws `"Synchronous config loading is not supported. Use loadConfigAsync() instead."` It exists only to give a clear error to anyone reaching for a sync API.
- **`clearConfigCache()`** — resets `cachedConfig` to `null` (tests / hot reload).

### `pathToFileURL` (local helper)

`loader.ts` builds the import URL itself rather than relying on `node:url`'s `pathToFileURL`: it resolves the path, converts backslashes on Win32, ensures a leading `/`, and returns `new URL("file://" + path)`. This keeps dynamic import working across platforms.

## Config types (`types/`)

```ts
// types/app.ts
interface AppConfig {
  projectConfig: ProjectConfig; // required
  modules?: ModuleConfigObject; // map id -> ModuleConfig
  hooks?: LifecycleHooks; // bootstrap lifecycle hooks (see below)
  links?: string | string[]; // cross-module link dir(s), e.g. "./src/links"
  services?: ServicesConfig; // redis/database/workflowLock/events/jobs overrides
}

// types/project.ts
interface ProjectConfig {
  databaseUrl?: string;
  redisUrl?: string;
  loggerConfig?: LoggerConfig; // from @damatjs/logger
  nodeEnv?: "development" | "production" | "test";
  http: HttpConfig; // required
}

// types/http.ts
interface HttpConfig {
  port: number;
  host: string;
  corsConfig?: string | CorsConfigType; // "*" / "a.com,b.com" / full object
  api?: {
    bathUrl?: string; // (sic) present in source, currently unused
    entryRouter?: string; // API mount path, default "/api"
    entryRouterPath?: string; // routes dir, default "/src/api/routes"
    healthCheckRouter?: string; // health path, default "/health"
  };
  rateLimit?: HttpRateLimitConfig; // global default rate limit
  auth?: HttpAuthConfig; // global default auth
}

interface HttpRateLimitConfig {
  requests: number;
  window: string; // "1m" | "5m" | "1h" | "1d"
  failClosed?: boolean; // reject with 503 when the rate-limit backend is down (default false: fail-open)
  getUserTier?: (userId: string) => Promise<HttpRateLimitConfig | null>;
  getApiKeyTier?: (apiKey: string) => Promise<HttpRateLimitConfig | null>;
}

interface HttpAuthConfig {
  type: AuthType;
} // AuthType = "session"|"apiKey"|"flexible"|"none"

// types/hooks.ts
interface LifecycleHookContext {
  config: ProjectConfig;
  logger: ILogger;
  app?: Hono; // set for beforeRoutes/afterRoutes, absent around service init
}
type LifecycleHook = (ctx: LifecycleHookContext) => void | Promise<void>;
interface LifecycleHooks {
  beforeServices?: LifecycleHook; // after config load, before logger/db/redis/module init
  afterServices?: LifecycleHook; // services are up, routes not yet built
  beforeRoutes?: LifecycleHook; // the Hono app exists, no routes registered yet
  afterRoutes?: LifecycleHook; // all routes registered, just before the 404 handler
}

// types/module.ts
interface ModuleConfigObject {
  [id: string]: ModuleConfig;
}
interface ModuleConfig {
  id?: string;
  resolve: string;
  options?: Record<string, unknown>;
}

// types/services.ts
interface ServicesConfig {
  redis?: RedisConfig; // from @damatjs/redis
  database?: DbPoolConfig; // from @damatjs/orm-type
  workflowLock?: boolean;
  events?: {
    // cross-process event broadcast (@damatjs/events); requires redisUrl
    broadcast?: boolean;
    channel?: string; // pub/sub channel, default "damat-events"
  };
  jobs?: {
    // durable PostgreSQL jobs; requires databaseUrl
    worker?: boolean; // only worker:true processes execute jobs
    queue?: string; // default "damat-jobs"
    concurrency?: number; // default 1
    pollIntervalMs?: number; // default 1000
  };
  auth?: {
    // pluggable auth provider (@damatjs/auth-*); optional, dynamically loaded
    provider: "better-auth" | "clerk" | "auth0" | string; // short name → @damatjs/auth-<name>; a "/" value is verbatim
    options?: Record<string, unknown>; // passed to the adapter factory (keys, table names, …)
    onAuthenticated?: (principal, c) => void | Promise<void>; // opt-in per-request local-user sync hook
  };
}
```

Each lifecycle hook is awaited at its stage; a hook that throws fails startup loudly (a broken hook must never boot a half-configured server). `beforeServices`/`afterServices` run in `entry.start`, `beforeRoutes`/`afterRoutes` inside `bootstrap` — see [bootstrap.md](./bootstrap.md).

## How config flows into the rest of the framework

- `projectConfig.databaseUrl` / `services.database` → `initDatabase` → `PoolManager.setup`.
- `projectConfig.redisUrl` / `services.redis` → `initRedis` + `connectRedis`.
- `services.events` / `services.jobs` → `initializeServices` connects the event broadcast (after Redis) and starts the job worker (after module init) — see [services.md](./services.md).
- `services.auth` → `initializeServices` calls `initAuth` (after the database, so a persisting provider gets the pool): it dynamically imports the adapter package, builds the provider, and returns `{ handlers, mountRoutes?, shutdown? }`. `entry.start` threads `authHandlers`/`authRoutes` into `bootstrap` (provider routes mount before the file router). Nothing is imported when `services.auth` is unset; a provider set but not installed fails boot with a clear install message.
- `hooks` → `entry.start` (`beforeServices`/`afterServices`) and `bootstrap` (`beforeRoutes`/`afterRoutes`).
- `modules` → `initModules(Object.values(config.modules), cwd)` → each module's `init()`.
- `links` → `resolveLinkModuleEntries(config.links, cwd)` (from `@damatjs/link`) → appended to the module configs as `link` module(s), then `initModules` initializes them alongside `modules`. `getModule("link")` then resolves the link service.
- `http.port` / `http.host` / `nodeEnv` → `ServerConfig` for `startServer`.
- `http.corsConfig` → `setupMiddleware` → `corsConfigSetter`.
- `http.rateLimit` / `http.auth` → `createFileRouter` → per-method config resolution.
- `http.api.entryRouter` / `entryRouterPath` / `healthCheckRouter` → mount paths.

## Gotchas

- **`loadConfig` is a trap.** It always throws; use `loadConfigAsync`. This is intentional (the config is TS and must be imported asynchronously).
- **Config is cached process-wide.** A second `loadConfigAsync` returns the first result regardless of `cwd`. Call `clearConfigCache()` in tests to reload.
- **`projectConfig` is mandatory and validated lightly.** The loader only checks that `config.projectConfig` exists; everything else is trusted by type, not runtime-validated.
- **`http.api.bathUrl` is a typo'd, unused field** preserved in the source type; don't depend on it.
- **`databaseUrl`/`redisUrl` are optional until a dependent service is enabled.** Omit `databaseUrl` and no pool is created; configuring durable `services.jobs` without it fails startup. Omit `redisUrl` and rate limiting is skipped. Event broadcast requires Redis, while durable jobs do not.
- **`rateLimit.failClosed` flips the outage behaviour.** By default a failing rate-limit check passes the request through (fail-open); with `failClosed: true` the middleware returns 503 `RATE_LIMIT_UNAVAILABLE` instead. See [middleware.md](./middleware.md).
- **`links` is a directory path, not a module map.** It accepts a single path or an array of paths; each must point at a directory whose `index.ts` default-exports `defineLinkModule(...)` and exports `models`. The framework turns these into `link` module entries and initializes them with the rest of the modules — no manual `modules` entry is needed.
