# @damatjs/framework — Internals

Maintainer notes for the core framework. This index gives the module map, the end-to-end boot/request flow, and the global invariants; the split docs cover each concern in depth.

## Module map

| File / dir                  | Responsibility                                                                                                                                                                                                                                                                                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`              | Public barrel. Re-exports bootstrap, config, context, server, shutdown, entry, redis service, the module-registry helpers, framework types, **all of `@damatjs/services`**, **the link authoring surface from `@damatjs/link`** (`defineLink`, `defineLinkModule`, `collectLinkModels`, ...), **all of `@damatjs/events`**, and **all of `@damatjs/jobs`**. |
| `src/entry.ts`              | `start(cwd?)` — the full boot pipeline (runs the `beforeServices`/`afterServices` lifecycle hooks); `runEntry()` — `start()` with error handling.                                                                                                                                                                                                           |
| `src/context.ts`            | Typed Hono context: `ContextVariableMap` augmentation (`requestId`, `startTime`, `logger`, optional `user`/`team`/`userId`), `AuthUser`/`AuthTeam`, and the accessors `getRequestLogger(c)`, `getUser(c)`, `getTeam(c)`. See [middleware.md](./middleware.md).                                                                                              |
| `src/types.ts`              | Cross-cutting types: `ServerConfig`, `HealthCheckConfig`/`HealthCheckFn`, `BootstrapOptions`/`BootstrapResult`, `ShutdownHandler`; re-exports `Logger`/`ILogger`.                                                                                                                                                                                           |
| `src/bootstrap/index.ts`    | `bootstrap(options)` — builds the Hono app (onError + middleware + file router + dev/health routes; runs the `beforeRoutes`/`afterRoutes` lifecycle hooks). See [bootstrap.md](./bootstrap.md).                                                                                                                                                             |
| `src/config/`               | `defineConfig`, async config loader, and all config types (incl. `LifecycleHooks`). See [config.md](./config.md).                                                                                                                                                                                                                                           |
| `src/router/`               | File-based router: scanner, builder, `defineRoute`, `response`, per-method config resolution, route types. See [router.md](./router.md).                                                                                                                                                                                                                    |
| `src/middleware/`           | `setupMiddleware`, error handler, not-found, request setup, rate limit, auth, validator, CORS config. See [middleware.md](./middleware.md).                                                                                                                                                                                                                 |
| `src/handlers/`             | Built-in routes: `/` info (`/damat`), route introspection (`/damat/api/routes`), `/health`. See [handlers.md](./handlers.md).                                                                                                                                                                                                                               |
| `src/server/index.ts`       | `startServer` via `@hono/node-server`. See [server-and-shutdown.md](./server-and-shutdown.md).                                                                                                                                                                                                                                                              |
| `src/shutdown/index.ts`     | Signal handlers + shutdown-handler registry. See [server-and-shutdown.md](./server-and-shutdown.md).                                                                                                                                                                                                                                                        |
| `src/services/`             | Logger, database, Redis, resolved modules, module providers, auth, event broadcast, job worker, and cross-module link wiring. See [services.md](./services.md).                                                                                                                                                                                             |
| `src/utils/windowParser.ts` | `parseWindowToMs("1m" \| "5m" \| "1h" \| "1d")` for rate-limit windows.                                                                                                                                                                                                                                                                                     |
| `src/tests/`                | `bun:test` suites: health handler, router helpers/response, scanner (`folderToUrlPath`, `sortRoutes`), services (logger, redis).                                                                                                                                                                                                                            |

## Architecture overview

```
damat.config.ts (defineConfig)
        │ loadConfigAsync()
        │ hooks.beforeServices
        ▼
initializeServices(config)  ── logger ── database ── Redis ── event broadcast
        │                     └─ modules + links ── providers ── auth ── job worker
        │ returns { healthChecks, shutdownHandlers, modules, resolvedModules }
        │ hooks.afterServices
        ▼
bootstrap({ routesDir, routeProviders, projectConfig, healthCheck, hooks })
        │ new Hono()  → onError → setupMiddleware → hooks.beforeRoutes
        │             → app + external module file routers → mount at /api
        │             → dev + health routes  → hooks.afterRoutes  → notFound
        ▼ { app, config }
setupShutdownHandlers(logger); register service shutdown handlers
        ▼
startServer(app, config, logger)  → @hono/node-server serve(...)
```

## Boot pipeline (`entry.ts:start`)

1. **Load config** — `loadConfigAsync(cwd)` dynamically imports `damat.config.ts`, validates it has `projectConfig`, and caches it.
2. **`hooks.beforeServices`** — if configured, awaited before any service init; a throwing hook fails startup.
3. **Init services** — `initializeServices(config)`: creates the global logger; connects configured PostgreSQL and Redis services; connects optional event broadcast; imports modules and links; wires the link resolver; configures durable jobs from PostgreSQL and starts their worker after definitions load when `services.jobs.worker` is true. Returns `healthChecks` and `shutdownHandlers`.
4. **`hooks.afterServices`** — if configured, awaited once services are up.
5. **Resolve routes dir** — `config.projectConfig.http.api?.entryRouterPath ?? "/src/api/routes"`, joined with `cwd`.
6. **Bootstrap the app** — `bootstrap({ routesDir, projectConfig, healthCheck, hooks })` builds the Hono app (running `hooks.beforeRoutes`/`hooks.afterRoutes` around route registration).
7. **Shutdown handlers** — `setupShutdownHandlers(logger)` installs signal handlers; each service shutdown handler is `registerShutdown`ed.
8. **Serve** — `startServer(app, serverConfig, getLogger())`.

## Request flow (per HTTP request)

1. Global middleware (in order): `secureHeaders` → `timing` → `requestSetup` (sets `requestId`, `startTime`, child logger; logs request) → `cors` → `errorHandler` (try/catch wrapper). The context variables are typed via the `ContextVariableMap` augmentation in `src/context.ts`.
2. Route matching against the file router mounted at the API base path (default `/api`).
3. Per-route middleware (in registration order): route-level `middleware[]` → rate-limit (if resolved) → auth (if resolved) → validator (if present for the method) → the method handler.
4. On throw, `handleError` maps the error to a JSON envelope (`AppError`, `ZodError`, `HTTPException`, or generic): middleware-thrown errors via the `errorHandler` wrapper, handler-thrown errors via the `app.onError` hook `bootstrap` installs (Hono v4 routes handler throws to `onError`, not through middleware).
5. Unmatched paths hit `notFoundHandler` (404 envelope).

## Invariants & design decisions

- **Async-only config loading.** `loadConfig` exists but always throws; `loadConfigAsync` is the real loader (it `await import()`s the TS config). The loaded config is cached module-globally; `clearConfigCache()` resets it.
- **Global singletons via module state.** Logger (`services/logger.ts`), database connection manager (`services/database.ts`), and Redis client (`@damatjs/redis` singleton) are module-level singletons, retrieved with `getLogger()` / `getConnectionManager()` / `getRedis()`. The pool itself lives in `@damatjs/services` `PoolManager` (on `globalThis`).
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
