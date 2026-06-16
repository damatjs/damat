# @damatjs/framework — Internals

Maintainer notes for the core framework. This index gives the module map, the end-to-end boot/request flow, and the global invariants; the split docs cover each concern in depth.

## Module map

| File / dir | Responsibility |
| --- | --- |
| `src/index.ts` | Public barrel. Re-exports bootstrap, config, server, shutdown, entry, redis service, the module-registry helpers, framework types, and **all of `@damatjs/services`**. |
| `src/entry.ts` | `start(cwd?)` — the full boot pipeline; `runEntry()` — `start()` with error handling. |
| `src/types.ts` | Cross-cutting types: `ServerConfig`, `HealthCheckConfig`/`HealthCheckFn`, `BootstrapOptions`/`BootstrapResult`, `ShutdownHandler`; re-exports `Logger`/`ILogger`. |
| `src/bootstrap/index.ts` | `bootstrap(options)` — builds the Hono app (middleware + file router + dev/health routes). See [bootstrap.md](./bootstrap.md). |
| `src/config/` | `defineConfig`, async config loader, and all config types. See [config.md](./config.md). |
| `src/router/` | File-based router: scanner, builder, `defineRoute`, `response`, per-method config resolution, route types. See [router.md](./router.md). |
| `src/middleware/` | `setupMiddleware`, error handler, not-found, request setup, rate limit, auth, validator, CORS config. See [middleware.md](./middleware.md). |
| `src/handlers/` | Built-in routes: `/` info (`/damat`), route introspection (`/damat/api/routes`), `/health`. See [handlers.md](./handlers.md). |
| `src/server/index.ts` | `startServer` via `@hono/node-server`. See [server-and-shutdown.md](./server-and-shutdown.md). |
| `src/shutdown/index.ts` | Signal handlers + shutdown-handler registry. See [server-and-shutdown.md](./server-and-shutdown.md). |
| `src/services/` | Service wiring: `initializeServices`, logger, database (`PoolManager.setup`), redis (re-export), module registry. See [services.md](./services.md). |
| `src/utils/windowParser.ts` | `parseWindowToMs("1m" \| "5m" \| "1h" \| "1d")` for rate-limit windows. |
| `src/tests/` | `bun:test` suites: health handler, router helpers/response, scanner (`folderToUrlPath`, `sortRoutes`), services (logger, redis). |

## Architecture overview

```
damat.config.ts (defineConfig)
        │ loadConfigAsync()
        ▼
initializeServices(config)  ── logger ── PostgreSQL pool (PoolManager.setup) ── Redis ── modules
        │ returns { healthChecks, shutdownHandlers, modules }
        ▼
bootstrap({ routesDir, projectConfig, healthCheck })
        │ new Hono()  → setupMiddleware → createFileRouter (scan src/api/routes)
        │             → mount file router at /api  → dev + health routes  → notFound
        ▼ { app, config }
setupShutdownHandlers(logger); register service shutdown handlers
        ▼
startServer(app, config, logger)  → @hono/node-server serve(...)
```

## Boot pipeline (`entry.ts:start`)

1. **Load config** — `loadConfigAsync(cwd)` dynamically imports `damat.config.ts`, validates it has `projectConfig`, and caches it.
2. **Init services** — `initializeServices(config)`: creates the global logger; if `databaseUrl` is set, connects the pool and calls `PoolManager.setup(...)`; if `redisUrl` is set, inits + connects Redis; if `modules` are present, imports and registers each. Returns `healthChecks` and `shutdownHandlers`.
3. **Resolve routes dir** — `config.projectConfig.http.api?.entryRouterPath ?? "/src/api/routes"`, joined with `cwd`.
4. **Bootstrap the app** — `bootstrap({ routesDir, projectConfig, healthCheck })` builds the Hono app.
5. **Shutdown handlers** — `setupShutdownHandlers(logger)` installs signal handlers; each service shutdown handler is `registerShutdown`ed.
6. **Serve** — `startServer(app, serverConfig, getLogger())`.

## Request flow (per HTTP request)

1. Global middleware (in order): `secureHeaders` → `timing` → `requestSetup` (sets `requestId`, `startTime`, child logger; logs request) → `cors` → `errorHandler` (try/catch wrapper).
2. Route matching against the file router mounted at the API base path (default `/api`).
3. Per-route middleware (in registration order): route-level `middleware[]` → rate-limit (if resolved) → auth (if resolved) → validator (if present for the method) → the method handler.
4. On throw anywhere downstream, `errorHandler` → `handleError` maps the error to a JSON envelope (`AppError`, `ZodError`, `HTTPException`, or generic).
5. Unmatched paths hit `notFoundHandler` (404 envelope).

## Invariants & design decisions

- **Async-only config loading.** `loadConfig` exists but always throws; `loadConfigAsync` is the real loader (it `await import()`s the TS config). The loaded config is cached module-globally; `clearConfigCache()` resets it.
- **Global singletons via module state.** Logger (`services/logger.ts`), database connection manager (`services/database.ts`), and Redis client (`@damatjs/redis` singleton) are module-level singletons, retrieved with `getLogger()` / `getConnectionManager()` / `getRedis()`. The pool itself lives in `@damatjs/services` `PoolManager` (on `globalThis`).
- **Dev-only introspection.** `/damat` and `/damat/api/routes` and the route-list log are only mounted when `nodeEnv === "development"`. `/health` is mounted whenever a `healthCheck` is provided.
- **Standard response envelope.** Success: `{ success: true, data, meta: { requestId, timestamp } }`. Error: `{ success: false, error: { code, message, details? }, meta }`. Produced by `router/response.ts`, the error handler, the not-found handler, and the rate-limit/validator middleware.
- **Route specificity ordering.** The scanner sorts routes so static paths beat dynamic (`:param`), which beat catch-all (`*`), and shallower paths register before deeper ones — so Hono matches the most specific route.
- **Fail fast on bad routes.** If a route file fails to import, the builder logs and rethrows, aborting startup rather than silently skipping the route.
- **Config-driven middleware resolution.** Per-method rate limit/auth is resolved by precedence: explicit `false` disables; method config > route config > global config. See [router.md](./router.md) and [middleware.md](./middleware.md).

## Split docs

- [bootstrap.md](./bootstrap.md) — building the Hono app.
- [config.md](./config.md) — `defineConfig`, loader, config types.
- [router.md](./router.md) — file-based routing, scanner, route types, per-method config.
- [middleware.md](./middleware.md) — setup order, error handling, rate limit, auth, validator, CORS.
- [handlers.md](./handlers.md) — built-in info/introspection/health routes.
- [server-and-shutdown.md](./server-and-shutdown.md) — serving and graceful shutdown.
- [services.md](./services.md) — service wiring (logger, db, redis, modules).
