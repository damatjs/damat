# Bootstrap

Source: `src/bootstrap/index.ts`, driven by `src/entry.ts`, types in `src/types.ts`.

## Responsibility

`bootstrap` assembles a ready-to-serve Hono `app` from config, route directory, and (optional) health checks. It is the step between "services are initialized" and "start the server". It does **not** start listening — that is `startServer`.

`entry.start()` resolves the runtime and initializes shared services first. It
calls `bootstrap` and `startServer` only for `server` and `all` runtimes; a
`worker` runtime never builds an HTTP app.

## `bootstrap(options)`

```ts
export async function bootstrap(
  options: BootstrapOptions,
): Promise<BootstrapResult>;

interface BootstrapOptions {
  routesDir: string; // absolute path to scan for route.ts files
  routeProviders?: Array<{ routesDir: string; basePath: string }>;
  projectConfig: ProjectConfig; // port/host/cors/api/rateLimit/auth + nodeEnv
  healthCheck?: HealthCheckConfig; // { version?, checks?: { database?, redis? } }
  authHandlers?: AuthMiddlewareOptions; // app-provided session/apiKey/flexible verifiers
  authRoutes?: (app: Hono) => void; // provider-owned HTTP routes
  hooks?: LifecycleHooks; // beforeRoutes/afterRoutes run here (see config.md)
}

interface BootstrapResult {
  app: Hono; // the assembled Hono instance
  config: ServerConfig; // { port, host?, nodeEnv? }
}
```

### Step by step (`bootstrap/index.ts`)

1. `const logger = getLogger()` and log `"Starting server..."` with the port.
2. `const app = new Hono()`.
3. `app.onError((err, c) => handleError(c, err, logger))` — Hono v4 routes handler-thrown errors straight to `onError` (they never unwind through middleware), so this is what gives handler throws the JSON error envelope; the `errorHandler` middleware alone never sees them.
4. `setupMiddleware({ app, logger, corsConfig: projectConfig.http.corsConfig })` — installs the global middleware stack (see [middleware.md](./middleware.md)).
5. If `hooks.beforeRoutes` is set, `await` it with `{ config: projectConfig, logger, app }` — the app exists but no routes are registered yet; a throwing hook fails startup.
6. `createFileRouter({ routesDir, debug: nodeEnv === "development", logger, rateLimit: http.rateLimit, auth: http.auth, authHandlers })` — scans and builds the file router (see [router.md](./router.md)). `debug` enables per-route logging.
7. Mount the file router at the API base: `app.route(http.api?.entryRouter ?? "/api", fileRouter.router)`.
8. **Dev-only:** if `nodeEnv === "development"`, log the formatted route list and mount `createRootRoute` (`/damat`) and `createApiRoutesRoute` (`/damat/api/routes`).
9. If `healthCheck` is provided, mount `createHealthRoute(healthCheck, http.api?.healthCheckRouter)` (default path `/health`).
10. If `hooks.afterRoutes` is set, `await` it with `{ config: projectConfig, logger, app }` — every route is registered; the 404 handler is not installed yet.
11. `app.notFound(notFoundHandler)`.
12. Return `{ app, config: { port, host, nodeEnv } }`.

## `entry.start(cwd?)`

```ts
export async function start(
  cwd: string = process.cwd(),
  environment: RuntimeEnvironment = process.env,
): Promise<void>;
export async function runEntry(): Promise<void>; // start() wrapped in try/catch -> process.exit(1)
```

Pipeline (`entry.ts`):

1. `config = await loadConfigAsync(cwd)`.
2. `runtime = resolveRuntime(config, environment)` independently applies
   `DAMAT_RUNTIME_MODE` and `DAMAT_WORKER_TYPES` precedence.
3. Validate `config.runtime?.shutdownGraceMs`, initialize the configured logger,
   run `hooks.beforeServices`, and install single-flight signal handlers.
4. `initializeServices(config, cwd, runtime)` reuses that logger, then initializes
   database, Redis, modules/providers, auth/publishers, durable readiness, and
   selected workers in order.
5. Run `hooks.afterServices` and register every service shutdown handler.
6. If `runtime.servesHttp` is false, return without scanning routes or opening
   a listener.
7. Build the health config and route providers from initialized services.
8. Resolve `routesDir` from `cwd` and
   `http.api?.entryRouterPath ?? "src/api/routes"`.
9. `bootstrap(...)` builds the Hono app and runs `beforeRoutes`/`afterRoutes`.
10. `startServer(...)` returns a close handle, registered in shutdown phase
    `http`.

## Important types (`src/types.ts`, `src/config/types/runtime.ts`)

```ts
interface ServerConfig {
  port: number;
  host?: string;
  nodeEnv?: string;
}
interface HealthCheckFn {
  (): Promise<{ status: string; latency?: number; data?: unknown }>;
}
interface HealthCheckConfig {
  version?: string;
  checks?: { database?: HealthCheckFn; redis?: HealthCheckFn };
}
type RuntimeMode = "server" | "worker" | "all";
type WorkerCapability = "jobs" | "events";
```

`BootstrapResult.app` is typed `Hono` (via `@damatjs/deps/hono`), so callers get a real Hono instance without casting.

## Gotchas

- **`bootstrap` does not init services.** It calls `getLogger()` (which lazily inits a default logger if none exists) but assumes the pool/redis/modules were set up by `initializeServices` beforehand. Calling `bootstrap` standalone (e.g. in a test) gives you an app but no DB-backed behaviour unless you set up `PoolManager` yourself.
- **`bootstrap` is HTTP-only.** Runtime selection, durable migration readiness,
  worker startup, and phased shutdown belong to `entry`/`runtime`/`services`.
- **No durable admin routes are implicit.** The root package exposes headless
  inspection clients, but `bootstrap` does not mount them.
- **`routesDir` must be absolute** and is resolved by the caller (`entry.start` joins it with `cwd`). The scanner silently returns no routes if the directory doesn't exist (`scanDirectory` guards with `existsSync`), so a wrong path yields an empty API rather than an error.
- **Dev introspection leaks structure.** `/damat` and `/damat/api/routes` are intentionally dev-only; don't rely on them in production.
- **API base default is `/api`.** Override with `projectConfig.http.api.entryRouter`. The routes _directory_ default is `/src/api/routes`, overridden with `http.api.entryRouterPath`.
- **Handler errors go through `onError`, not middleware.** In Hono v4 an error thrown from a route handler is dispatched to `app.onError`; it never unwinds through the middleware chain, so the `errorHandler` middleware alone would leave handler throws with Hono's default 500. `bootstrap` installs both against the same `handleError`, so every throw gets the JSON error envelope.
- **Hooks fail startup.** `beforeRoutes`/`afterRoutes` (and `beforeServices`/`afterServices` in `entry.start`) are awaited; there is no try/catch around them — a rejecting hook propagates and aborts the boot.
