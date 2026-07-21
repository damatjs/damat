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
  providers?: Record<string, { module: string }>; // role -> module id
  hooks?: LifecycleHooks; // bootstrap lifecycle hooks (see below)
  links?: string | string[]; // cross-module link dir(s), e.g. "./src/links"
  services?: ServicesConfig;
  runtime?: RuntimeConfig;
}

type RuntimeMode = "server" | "worker" | "all";
type WorkerCapability = "jobs" | "events" | "pipelines";
interface RuntimeConfig {
  mode?: RuntimeMode; // default "all"
  workers?: WorkerCapability[]; // default enabled durable capabilities
  shutdownGraceMs?: number; // 0..2_147_483_647
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
  beforeServices?: LifecycleHook; // after configured logger init, before db/redis/module init
  afterServices?: LifecycleHook; // services are up, routes not yet built
  beforeRoutes?: LifecycleHook; // the Hono app exists, no endpoint routes registered yet
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
    broadcast?: boolean;
    channel?: string; // pub/sub channel, default "damat-events"
    durable?: {
      concurrency?: number;
      router?: {
        pollIntervalMs?: number;
        retryIntervalMs?: number;
        batchSize?: number;
      };
    };
  };
  jobs?: {
    queue?: string; // default "damat-jobs"
    concurrency?: number; // default 1
  };
  pipelines?: {
    queue?: string; // internal action/workflow queue, default "damat-pipelines"
    concurrency?: number; // internal action/workflow executions, default 1
    routerBatchSize?: number; // graph advances per transaction, default 100
    maxNodeActivationsPerRun?: number; // definition ceiling, default 10,000
    maxFanOut?: number; // foreach ceiling, default 1,000
    retentionMs?: number | "forever"; // default 90 days
  };
  durability?: {
    pollIntervalMs?: number;
    leaseMs?: number;
    heartbeatIntervalMs?: number;
    registryHeartbeatIntervalMs?: number;
    retryIntervalMs?: number;
    reconcileIntervalMs?: number;
    reconcileBatchSize?: number;
    retentionIntervalMs?: number;
    retentionMs?: number | "forever";
    progressMinimumIntervalMs?: number;
    logLimits?: WorkLogLimits;
    redaction?: RedactionOptions;
    inspectionVisibility?: InspectionVisibility;
    wakeups?: boolean;
    acceleration?: {
      enabled?: boolean;
      healthySafetyPollIntervalMs?: number;
      degradedMaxPollIntervalMs?: number;
      workerLivenessTtlMs?: number;
      durableWorkerSnapshotIntervalMs?: number;
      relayBatchSize?: number;
    };
  };
}
```

`projectConfig.releaseVersion` is the immutable application/deployment identity
reported by `/health` and development metadata. Production deployments should
set it from their release artifact or commit digest.

`services.jobs` enables the durable job capability.
`services.events.durable` enables the durable event capability.
`services.pipelines` enables the durable pipeline router and internal node worker.
Runtime selection decides which enabled capabilities execute in the current process.
All durable capabilities require `projectConfig.databaseUrl` and applied
system migrations. Run:

```bash
damat-orm migrate:up
```

Redis is optional for durable execution. Acceleration defaults to enabled when
`redisUrl` exists: Redis wake-ups trigger prompt work, PostgreSQL safety-scans
every 30 seconds, and Redis worker liveness expires after 10 seconds. Missing,
unauthorized, or disconnected Redis switches the process to coordinated
PostgreSQL polling within five seconds and retries Redis with bounded backoff.
`wakeups` and `pollIntervalMs` remain compatibility inputs when `acceleration`
does not supply their replacements.

## Runtime resolution

The two environment settings override config independently:

1. `DAMAT_RUNTIME_MODE` → `runtime.mode` → `"all"`.
2. `DAMAT_WORKER_TYPES` → `runtime.workers` → enabled durable capabilities.

`DAMAT_WORKER_TYPES` is a comma-separated list of `jobs`, `events`, and `pipelines`.
Whitespace and duplicates are removed. Unknown values fail startup.

- `server` serves HTTP and always resolves no workers.
- `worker` serves no HTTP and requires at least one selected, enabled worker.
- `all` serves HTTP and starts selected workers; it may have no workers.

Unknown modes and capabilities always fail startup. In `worker` and `all`
modes, selecting `jobs` without `services.jobs`, or `events` without
`services.events.durable`, or `pipelines` without `services.pipelines`, also
fails startup. `server` is the deliberate
exception: it drops known worker selections without checking their service
availability because it never executes workers. The same application image can
therefore be deployed as separate HTTP and worker containers by setting only
environment variables.

Each lifecycle hook is awaited at its stage; a hook that throws fails startup loudly (a broken hook must never boot a half-configured server). `beforeServices`/`afterServices` run in `entry.start`, `beforeRoutes`/`afterRoutes` inside `bootstrap` — see [bootstrap.md](./bootstrap.md).

## How config flows into the rest of the framework

- `projectConfig.databaseUrl` / `services.database` → `initDatabase` → `PoolManager.setup`.
- `projectConfig.redisUrl` / `services.redis` → `initRedis` + `connectRedis`.
- `projectConfig.releaseVersion` → operational health and development metadata.
- `services.events` / `services.jobs` / `services.pipelines` / `services.durability` → event broadcast,
  PostgreSQL migration readiness, optional Redis wakeups, and the selected
  durable workers — see [services.md](./services.md).
- `runtime` plus `DAMAT_RUNTIME_MODE` / `DAMAT_WORKER_TYPES` →
  `resolveRuntime` → conditional worker and HTTP startup.
- `providers` → role-to-module validation after module initialization. Each
  binding stores the exact module service reference; `providers.auth` also
  validates the auth/API-key contract and builds route authentication handlers.
- `hooks` → `entry.start` (`beforeServices`/`afterServices`) and `bootstrap` (`beforeRoutes`/`afterRoutes`).
- `modules` → keyed module configs → each module's `init()` exactly once.
- `links` → `resolveLinkModuleEntries(config.links, cwd)` (from `@damatjs/link`) → appended to the module configs as `link` module(s), then `initModules` initializes them alongside `modules`. `getModule("link")` then resolves the link service.
- `http.port` / `http.host` / `nodeEnv` → `ServerConfig` for `startServer` when
  the resolved runtime serves HTTP.
- `http.corsConfig` → `setupMiddleware` → `corsConfigSetter`.
- `http.rateLimit` / `http.auth` → `createFileRouter` → per-method config resolution.
- `http.api.entryRouter` / `entryRouterPath` / `healthCheckRouter` → mount paths.

## Gotchas

- **`loadConfig` is a trap.** It always throws; use `loadConfigAsync`. This is intentional (the config is TS and must be imported asynchronously).
- **Config is cached process-wide.** A second `loadConfigAsync` returns the first result regardless of `cwd`. Call `clearConfigCache()` in tests to reload.
- **`projectConfig` is mandatory.** The loader checks that it exists. Runtime
  mode, worker capabilities, shutdown grace, and durable-worker numeric options
  receive runtime validation during startup; other config fields rely on their
  owning service's validation and the TypeScript contract.
- **`http.api.bathUrl` is a typo'd, unused field** preserved in the source type; don't depend on it.
- **`databaseUrl`/`redisUrl` are optional until a dependent service is enabled.**
  Omit `databaseUrl` and no pool is created; jobs or durable events then fail
  startup. Omit `redisUrl` and rate limiting, event broadcast, and wakeups are
  unavailable. PostgreSQL durable polling does not require Redis.
- **`rateLimit.failClosed` flips the outage behaviour.** By default a failing rate-limit check passes the request through (fail-open); with `failClosed: true` the middleware returns 503 `RATE_LIMIT_UNAVAILABLE` instead. See [middleware.md](./middleware.md).
- **`links` is a directory path, not a module map.** It accepts a single path or an array of paths; each must point at a directory whose `index.ts` default-exports `defineLinkModule(...)` and exports `models`. The framework turns these into `link` module entries and initializes them with the rest of the modules — no manual `modules` entry is needed.
