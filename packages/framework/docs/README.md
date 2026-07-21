# @damatjs/framework — Internals

Maintainer notes for the core framework. This index gives the module map, the end-to-end boot/request flow, and the global invariants; the split docs cover each concern in depth.

## Module map

| File / dir                  | Responsibility                                                                                                                                                                                                                                                 |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`              | Public barrel. Re-exports framework runtime/config/HTTP APIs plus `@damatjs/services`, link authoring, events, jobs, and durability, including their headless inspection clients.                                                                              |
| `src/entry.ts`              | `start(cwd?, environment?)` — resolves and starts the selected HTTP/worker runtime; `runEntry()` — `start()` with error handling.                                                                                                                              |
| `src/runtime/`              | Pure environment/config resolution, shutdown-grace validation, selected worker startup, and conditional HTTP startup.                                                                                                                                          |
| `src/context.ts`            | Typed Hono context: `ContextVariableMap` augmentation (`requestId`, `startTime`, `logger`, optional `user`/`team`/`userId`), `AuthUser`/`AuthTeam`, and the accessors `getRequestLogger(c)`, `getUser(c)`, `getTeam(c)`. See [middleware.md](./middleware.md). |
| `src/types.ts`              | Cross-cutting HTTP types: `ServerConfig`, `HealthCheckConfig`/`HealthCheckFn`, `BootstrapOptions`/`BootstrapResult`; shutdown types live under `src/shutdown/`.                                                                                                |
| `src/bootstrap/index.ts`    | `bootstrap(options)` — builds the Hono app (onError + middleware + file router + dev/health routes; runs the `beforeRoutes`/`afterRoutes` lifecycle hooks). See [bootstrap.md](./bootstrap.md).                                                                |
| `src/config/`               | `defineConfig`, async config loader, and all config types (incl. `LifecycleHooks`). See [config.md](./config.md).                                                                                                                                              |
| `src/router/`               | File-based router: scanner, builder, `defineRoute`, `response`, per-method config resolution, route types. See [router.md](./router.md).                                                                                                                       |
| `src/middleware/`           | `setupMiddleware`, error handler, not-found, request setup, rate limit, auth, validator, CORS config. See [middleware.md](./middleware.md).                                                                                                                    |
| `src/handlers/`             | Built-in routes: `/` info (`/damat`), route introspection (`/damat/api/routes`), `/health`. See [handlers.md](./handlers.md).                                                                                                                                  |
| `src/server/index.ts`       | `startServer` via `@hono/node-server`. See [server-and-shutdown.md](./server-and-shutdown.md).                                                                                                                                                                 |
| `src/shutdown/index.ts`     | Signal handlers + shutdown-handler registry. See [server-and-shutdown.md](./server-and-shutdown.md).                                                                                                                                                           |
| `src/services/`             | Logger, database, Redis, modules, provider-role bindings, auth, event broadcast, durability readiness, optional wakeups, selected durable workers, and cross-module link wiring. See [services.md](./services.md).                                             |
| `src/utils/windowParser.ts` | `parseWindowToMs("1m" \| "5m" \| "1h" \| "1d")` for rate-limit windows.                                                                                                                                                                                        |
| `src/tests/`                | `bun:test` suites: health handler, router helpers/response, scanner (`folderToUrlPath`, `sortRoutes`), services (logger, redis).                                                                                                                               |

## Architecture overview

```
damat.config.ts + process environment
        │ loadConfigAsync() → resolveRuntime() → initLogger(config)
        │ hooks.beforeServices
        ▼
initializeServices(config, cwd, runtime)
        │ logger → PostgreSQL → Redis → modules → role bindings → auth/publishers
        │ → durable migration readiness → selected workers
        │ hooks.afterServices
        ▼
register phased shutdown handlers
        │
        ├─ runtime serves HTTP → bootstrap(...) → startServer(...)
        │
        └─ worker-only runtime → no Hono app or listening socket
```

## Boot pipeline (`entry.ts:start`)

1. **Load and resolve** — `loadConfigAsync(cwd)` imports `damat.config.ts`;
   `resolveRuntime(config, environment)` applies environment precedence and
   validates the mode and selected capabilities.
2. **Validate and log** — `runtime.shutdownGraceMs` is checked, then the logger
   is initialized from `projectConfig.loggerConfig`; shutdown signals use that
   same instance.
3. **`hooks.beforeServices`** — if configured, awaited with the configured
   logger before the remaining services initialize.
4. **Init shared services** — the logger is reused, then PostgreSQL, Redis,
   modules, provider-role bindings, auth, and optional event publishers initialize in
   dependency order.
5. **Durable readiness** — jobs, durable events, or pipelines configure the pool-backed
   durability client and verify every selected system migration. Failure tells
   the operator to run `damat-orm migrate:up`.
6. **Start selected workers** — job, event, and/or pipeline workers start only when
   the resolved runtime selects them, after module definitions are registered.
7. **`hooks.afterServices`** — if configured, awaited after service startup.
8. **Register shutdown** — service handlers are registered by phase.
9. **Conditional HTTP** — server/all runtimes build routes and start Hono;
   worker runtimes never build or listen on an HTTP server. The close handle is
   registered in the HTTP shutdown phase.

## Request flow (per HTTP request)

1. Global middleware (in order): `secureHeaders` → `timing` → `requestSetup` (sets `requestId`, `startTime`, child logger; logs request) → `cors` → `errorHandler` (try/catch wrapper). The context variables are typed via the `ContextVariableMap` augmentation in `src/context.ts`.
2. Route matching against the file router mounted at the API base path (default `/api`).
3. Per-route middleware (in registration order): route-level `middleware[]` → rate-limit (if resolved) → auth (if resolved) → validator (if present for the method) → the method handler.
4. On throw, `handleError` maps the error to a JSON envelope (`AppError`, `ZodError`, `HTTPException`, or generic): middleware-thrown errors via the `errorHandler` wrapper, handler-thrown errors via the `app.onError` hook `bootstrap` installs (Hono v4 routes handler throws to `onError`, not through middleware).
5. Unmatched paths hit `notFoundHandler` (404 envelope).

## Invariants & design decisions

- **Async-only config loading.** `loadConfig` exists but always throws; `loadConfigAsync` is the real loader (it `await import()`s the TS config). The loaded config is cached module-globally; `clearConfigCache()` resets it.
- **Global singletons via module state.** Logger (`services/logger.ts`), database connection manager (`services/database.ts`), and Redis client (`@damatjs/redis` singleton) are module-level singletons, retrieved with `getLogger()` / `getConnectionManager()` / `getRedis()`. The pool itself lives in `@damatjs/services` `PoolManager` (on `globalThis`).
- **PostgreSQL owns durable state.** Jobs and durable events require a database
  and applied system migrations. Redis wakeups are optional latency hints;
  polling PostgreSQL remains the fallback.
- **Runtime sources resolve independently.** `DAMAT_RUNTIME_MODE` overrides
  `runtime.mode`; `DAMAT_WORKER_TYPES` overrides `runtime.workers`. Defaults are
  `all` and the enabled durable service capabilities. Unknown selections always
  fail. Known but unavailable selections fail in `worker` and `all`; `server`
  drops them because it never executes workers.
- **No implicit operations endpoints.** Root exports include headless jobs,
  events, and durability clients. Applications decide whether and how to expose
  them behind authentication and authorization.
- **Dev-only introspection.** `/damat` and `/damat/api/routes` and the route-list log are only mounted when `nodeEnv === "development"`. `/health` is mounted whenever a `healthCheck` is provided.
- **Standard response envelope.** Success: `{ success: true, data, meta: { requestId, timestamp } }`. Error: `{ success: false, error: { code, message, details? }, meta }`. Produced by `router/response.ts`, the error handler, the not-found handler, and the rate-limit/validator middleware.
- **Route specificity ordering.** The scanner sorts routes so static paths beat dynamic (`:param`), which beat catch-all (`*`), and shallower paths register before deeper ones — so Hono matches the most specific route.
- **Fail fast on bad routes.** If a route file fails to import, the builder logs and rethrows, aborting startup rather than silently skipping the route.
- **Fail fast on bad hooks.** Every lifecycle hook (`beforeServices`/`afterServices`/`beforeRoutes`/`afterRoutes`) is awaited at its stage; a throwing hook fails startup — a broken hook must never boot a half-configured server.
- **Errors are enveloped via two paths.** `errorHandler` (middleware) catches middleware throws; `app.onError` (installed by `bootstrap`) catches handler throws — both delegate to the same `handleError`. Hono v4 never routes handler throws through middleware.
- **Config-driven middleware resolution.** Per-method rate limit/auth is resolved by precedence: explicit `false` disables; method config > route config > global config. See [router.md](./router.md) and [middleware.md](./middleware.md).

## Split docs

- [bootstrap.md](./bootstrap.md) — building the Hono app.
- [config.md](./config.md) — `defineConfig`, loader, config types.
- [router.md](./router.md) — file-based routing, scanner, route types, per-method config.
- [middleware.md](./middleware.md) — setup order, error handling, rate limit, auth, validator, CORS.
- [handlers.md](./handlers.md) — built-in info/introspection/health routes.
- [server-and-shutdown.md](./server-and-shutdown.md) — serving and graceful shutdown.
- [services.md](./services.md) — service wiring (logger, db, redis, events, jobs, modules).
