# @damatjs/framework

> The core Damat framework: load config, wire services, build a Hono app from file-based routes, and run it with graceful shutdown.

`@damatjs/framework` is the entry point that turns a `damat.config.ts` and a folder of route files into a running HTTP server. It loads and validates config, initializes services (logger, PostgreSQL pool via `@damatjs/services`, Redis, modules), scans `src/api/routes/**/route.ts` into a Hono router (with per-route validation, rate limiting, and auth), installs standard middleware (CORS, secure headers, request IDs, structured error handling), exposes health/introspection endpoints, starts the server through `@hono/node-server`, and registers SIGINT/SIGTERM shutdown handlers.

It sits at the top of the Damat backend stack: it depends on `@damatjs/services`, `@damatjs/redis`, the ORM packages, `@damatjs/logger`, `@damatjs/types`, `@damatjs/workflow-engine`, `@damatjs/link`, `@damatjs/events`, `@damatjs/jobs`, and `@damatjs/deps`, and re-exports the service layer, the link authoring surface, and the events/jobs surfaces so apps import everything from one place.

Part of the [Damat](../../README.md) monorepo · [Full guide](../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

```bash
bun add @damatjs/framework
```

Inside the monorepo it is referenced via the workspace protocol (`"@damatjs/framework": "*"`).

## When to use

Use it when:

- You are building a Damat backend app and want the full bootstrap (config → services → router → server → shutdown) with one `start()` call.
- You want file-based routing with declarative per-route validation / rate limiting / auth config.
- You want the standard request/response envelope, structured error handling, and `/health` + `/damat` introspection endpoints.

Pick a **subpath** instead of the whole framework when you only need one piece — e.g. `@damatjs/framework/router` for route helpers in a route file, or `@damatjs/framework/config` for `defineConfig` in `damat.config.ts`.

Do **not** use it as a thin Hono wrapper if you don't want the opinionated services/module wiring — use Hono (via `@damatjs/deps/hono`) directly.

## Quick start

`damat.config.ts` at the project root:

```ts
import { defineConfig } from "@damatjs/framework";

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    nodeEnv: "development",
    http: {
      port: Number(process.env.PORT) || 6543,
      host: process.env.HOST || "0.0.0.0",
      corsConfig: process.env.FRONTEND_CORS, // "*" or comma-separated origins
    },
  },
  modules: {
    user: { resolve: "./src/modules/user", id: "user" },
    billing: { resolve: { type: "package", name: "@acme/billing" } },
    audit: { resolve: { type: "damat", path: "audit/index.ts" } },
  },
  links: "./src/links",
});
```

String module locations are project-relative editable source. Package
locations import a Node package specifier. Damat locations are constrained to
the project's `.damat/packages` store; traversal outside it is rejected.

`links` points at a directory whose `index.ts` default-exports `defineLinkModule(...)` and exports `models`. The framework registers it as a `link` module, so cross-module links boot, migrate, and type-generate alongside your modules.

A route file at `src/api/routes/users/[userId]/route.ts`:

```ts
import { defineRoute } from "@damatjs/framework/router";

export const GET = defineRoute<{ userId: string }>(async (c, params) => {
  return c.json({ success: true, data: { id: params.userId } });
});
```

Entry point that boots everything:

```ts
import { start } from "@damatjs/framework";

await start(); // loads damat.config.ts from cwd, wires services, scans routes, serves
```

### Opt-in config

Everything below is off unless configured. Full field reference in [docs/config.md](./docs/config.md).

```ts
export default defineConfig({
  projectConfig: {
    // ...
    http: {
      // ...
      rateLimit: { requests: 100, window: "1m", failClosed: true }, // 503 when the limiter backend is down (default: fail-open)
    },
  },
  // Bootstrap lifecycle hooks — each awaited; a throwing hook fails startup.
  hooks: {
    beforeServices: ({ config, logger }) => {}, // after config load, before db/redis/modules
    afterServices: ({ config, logger }) => {}, // services up, routes not built yet
    beforeRoutes: ({ app, config, logger }) => {}, // Hono app exists, no routes yet
    afterRoutes: ({ app, config, logger }) => {}, // all routes registered, before the 404 handler
  },
  services: {
    events: { broadcast: true }, // cross-process event delivery via Redis pub/sub (needs redisUrl)
    jobs: { worker: true, concurrency: 4 }, // run the background job worker in this process (needs redisUrl)
  },
});
```

Inside a route, request context is typed with no casts (`ContextVariableMap` is augmented):

```ts
import { getRequestLogger, getUser } from "@damatjs/framework";

export const GET = defineRoute(async (c) => {
  getRequestLogger(c).info("hit"); // the request-scoped child logger
  const user = getUser(c); // AuthUser | undefined (set by your auth middleware)
  return c.json({ success: true, data: { userId: user?.id } });
});
```

Route-handler throws are turned into the framework's JSON error envelope automatically (bootstrap installs `app.onError` — in Hono v4 handler errors bypass middleware). The `@damatjs/events` bus (`getEventBus().on/emit`) and `@damatjs/jobs` (`defineJob`/`enqueueJob`) are re-exported here; see their READMEs.

## API

The package has many subpath exports. Import the narrowest one you need.

| Export                          | Kind   | Summary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@damatjs/framework`            | barrel | Re-exports `bootstrap`, `config`, `context` (typed Hono context: `getRequestLogger`, `getUser`, `getTeam`, `AuthUser`/`AuthTeam`), `server`, `shutdown`, `entry`, `services/redis`, the module registry helpers (`getModule`, `hasModule`, `clearModules`, `getAllModules`, `initModules`, `registerModule`), framework types, **all of `@damatjs/services`**, **the link authoring surface from `@damatjs/link`** (`defineLink`, `defineLinkModule`, `collectLinkModels`, ...), **all of `@damatjs/events`**, and **all of `@damatjs/jobs`**. |
| `@damatjs/framework/entry`      | module | `start(cwd?)` — full boot pipeline; `runEntry()` — `start()` with top-level error handling + `process.exit(1)`.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `@damatjs/framework/config`     | module | `defineConfig(config)`, `loadConfigAsync(cwd?)`, `loadConfig` (throws — use async), `clearConfigCache()`, and all config types (`AppConfig`, `ProjectConfig`, `HttpConfig`, `HttpRateLimitConfig`, `HttpAuthConfig`, `ModuleConfig`, `ServicesConfig`, `LifecycleHooks`).                                                                                                                                                                                                                                                                      |
| `@damatjs/framework/bootstrap`  | module | `bootstrap(options) => { app, config }` — builds the Hono app (middleware + file router + handlers) without starting it.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `@damatjs/framework/router`     | module | `createFileRouter(options)`, `defineRoute(handler)`, `response` helpers, `resolveMethodConfig`, the scanner (`scanDirectory`, `sortRoutes`, `folderToUrlPath`), and all router types (`RouteHandler`, `RouteModule`, `RouteModuleConfig`, `RouteValidator`, `AuthType`, `HttpMethod`, `FileRouter`, ...).                                                                                                                                                                                                                                      |
| `@damatjs/framework/middleware` | module | `setupMiddleware`, `errorHandler`, `notFoundHandler`, `requestSetup`, `createRateLimitMiddleware`, `createAuthMiddleware`, `corsConfigSetter`, `getErrorCodeFromStatus`, and `CorsConfigType`. (`validate`/`createValidatorMiddleware` live in `middleware/validator.ts` and are wired internally by the route builder, not re-exported.)                                                                                                                                                                                                      |
| `@damatjs/framework/handlers`   | module | `createRootRoute`, `createApiRoutesRoute`, `createHealthRoute`, plus `HealthCheckOptions`/`HealthCheckFn`.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `@damatjs/framework/server`     | module | `startServer(app, config, logger)` — runs the Hono app via `@hono/node-server`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `@damatjs/framework/shutdown`   | module | `setupShutdownHandlers(logger)`, `registerShutdown(handler)`, `runShutdownHandlers(logger)` — SIGINT/SIGTERM/uncaught handling.                                                                                                                                                                                                                                                                                                                                                                                                                |
| `@damatjs/framework/services`   | module | Service wiring: `initializeServices(config, cwd?)`, logger (`initLogger`, `getLogger`, ...), database (`initDatabase`, `closeDatabase`, `getConnectionManager`), redis (re-export of `@damatjs/redis`), and module registry helpers.                                                                                                                                                                                                                                                                                                           |

Key types: `AppConfig`, `ProjectConfig`, `HttpConfig`, `LifecycleHooks`, `BootstrapOptions`, `BootstrapResult`, `ServerConfig`, `HealthCheckConfig`, `ShutdownHandler`, `RouteModule`, `RouteValidator`, `AuthType`, `AuthUser`, `AuthTeam`.

The barrel also ships `src/context.ts`: a `ContextVariableMap` augmentation (`requestId`, `startTime`, `logger`, plus optional `user`/`team`/`userId`) so `c.get(...)`/`c.set(...)` are fully typed in app code — no casts — with `getRequestLogger(c)`, `getUser(c)`, and `getTeam(c)` as typed accessors.

## How it fits

- **Dependencies:** `@damatjs/services`, `@damatjs/redis`, `@damatjs/logger`, `@damatjs/types`, `@damatjs/orm-connector`, `@damatjs/orm-type`, `@damatjs/workflow-engine`, `@damatjs/link`, `@damatjs/events`, `@damatjs/jobs`, `@damatjs/deps`, and `@hono/node-server`.
- **In-repo dependents:** the reference app `@damatjs/default` (`backend/default`) imports `defineConfig`, `defineRoute`/`RouteHandler`, `ModuleService`, and `defineModule` from here. The framework's `services/database.ts` calls `PoolManager.setup(...)` from `@damatjs/services`, and `services/moduleService.ts` registers each app module.

## Documentation

- [Internals & architecture](./docs/README.md)
- [Bootstrap](./docs/bootstrap.md) · [Config](./docs/config.md) · [Router](./docs/router.md) · [Middleware](./docs/middleware.md) · [Handlers](./docs/handlers.md) · [Server & shutdown](./docs/server-and-shutdown.md) · [Services](./docs/services.md)
- [Full Damat guide](../../docs/GUIDE.md)

## License

MIT
