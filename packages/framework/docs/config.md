# Config

Source: `src/config/` — `define.ts`, `loader.ts`, `types/`.

## Responsibility

Define and load the application configuration (`damat.config.ts`). `defineConfig` is an identity helper that gives you type-checking and inference; `loadConfigAsync` dynamically imports the config file at runtime and caches it.

## `defineConfig`

```ts
export function defineConfig(config: AppConfig): AppConfig { return config; }
```

Pure identity — its only job is to attach the `AppConfig` type to your object literal so the editor checks it and infers field types. Used at the top of `damat.config.ts`.

## Loading

```ts
const CONFIG_FILE = "damat.config.ts";
let cachedConfig: AppConfig | null = null;

export function loadConfig(cwd?: string): AppConfig;          // ALWAYS THROWS — see below
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
  projectConfig: ProjectConfig;     // required
  modules?: ModuleConfigObject;     // map id -> ModuleConfig
  services?: ServicesConfig;        // redis/database/workflowLock overrides
}

// types/project.ts
interface ProjectConfig {
  databaseUrl?: string;
  redisUrl?: string;
  loggerConfig?: LoggerConfig;       // from @damatjs/logger
  nodeEnv?: "development" | "production" | "test";
  http: HttpConfig;                  // required
}

// types/http.ts
interface HttpConfig {
  port: number;
  host: string;
  corsConfig?: string | CorsConfigType;     // "*" / "a.com,b.com" / full object
  api?: {
    bathUrl?: string;                        // (sic) present in source, currently unused
    entryRouter?: string;                    // API mount path, default "/api"
    entryRouterPath?: string;                // routes dir, default "/src/api/routes"
    healthCheckRouter?: string;              // health path, default "/health"
  };
  rateLimit?: HttpRateLimitConfig;           // global default rate limit
  auth?: HttpAuthConfig;                     // global default auth
}

interface HttpRateLimitConfig {
  requests: number;
  window: string;                            // "1m" | "5m" | "1h" | "1d"
  getUserTier?: (userId: string) => Promise<HttpRateLimitConfig | null>;
  getApiKeyTier?: (apiKey: string) => Promise<HttpRateLimitConfig | null>;
}

interface HttpAuthConfig { type: AuthType; }  // AuthType = "session"|"apiKey"|"flexible"|"none"

// types/module.ts
interface ModuleConfigObject { [id: string]: ModuleConfig; }
interface ModuleConfig { id?: string; resolve: string; options?: Record<string, unknown>; }

// types/services.ts
interface ServicesConfig {
  redis?: RedisConfig;               // from @damatjs/redis
  database?: DbPoolConfig;           // from @damatjs/orm-type
  workflowLock?: boolean;
}
```

## How config flows into the rest of the framework

- `projectConfig.databaseUrl` / `services.database` → `initDatabase` → `PoolManager.setup`.
- `projectConfig.redisUrl` / `services.redis` → `initRedis` + `connectRedis`.
- `modules` → `initModules(Object.values(config.modules), cwd)` → each module's `init()`.
- `http.port` / `http.host` / `nodeEnv` → `ServerConfig` for `startServer`.
- `http.corsConfig` → `setupMiddleware` → `corsConfigSetter`.
- `http.rateLimit` / `http.auth` → `createFileRouter` → per-method config resolution.
- `http.api.entryRouter` / `entryRouterPath` / `healthCheckRouter` → mount paths.

## Gotchas

- **`loadConfig` is a trap.** It always throws; use `loadConfigAsync`. This is intentional (the config is TS and must be imported asynchronously).
- **Config is cached process-wide.** A second `loadConfigAsync` returns the first result regardless of `cwd`. Call `clearConfigCache()` in tests to reload.
- **`projectConfig` is mandatory and validated lightly.** The loader only checks that `config.projectConfig` exists; everything else is trusted by type, not runtime-validated.
- **`http.api.bathUrl` is a typo'd, unused field** preserved in the source type; don't depend on it.
- **`databaseUrl`/`redisUrl` are optional.** Omit `databaseUrl` and no pool is created (health reports `"not configured"`); omit `redisUrl` and rate limiting is skipped (the middleware no-ops when Redis is absent).
