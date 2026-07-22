# @damatjs/framework

> The core Damat framework: load config, wire services, and run HTTP and durable-worker processes with ordered shutdown.

`@damatjs/framework` turns one `damat.config.ts` and application build into an
HTTP server, a selected durable-worker process, or both. It initializes the
logger, PostgreSQL, optional Redis, modules, provider-role bindings, and auth
request handlers before checking
migration readiness. It starts one process-level durability coordinator and
Redis wake-up transport after readiness, then starts selected job/event/pipeline workers and
builds the Hono HTTP app only when the resolved runtime serves HTTP.

Low-level embedders may pass `initializeServices` a `beforeDurability` callback.
It runs after database/module/provider-definition loading and before durability
readiness or workers; failures run ordered partial cleanup. Normal application
startup does not supply it and never mutates schemas.

It sits at the top of the Damat backend stack: it depends on `@damatjs/services`,
`@damatjs/redis`, the ORM packages, `@damatjs/logger`, `@damatjs/types`,
`@damatjs/workflow-engine`, `@damatjs/link`, `@damatjs/events`, `@damatjs/jobs`,
`@damatjs/pipelines`, and `@damatjs/deps`, and re-exports their app-facing surfaces.

Part of the [Damat](../../README.md) monorepo · [Full guide](../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

```bash
bun add @damatjs/framework
```

Inside the monorepo it is referenced via the workspace protocol (`"@damatjs/framework": "*"`).

## When to use

Use it when:

- You are building a Damat backend app and want one `start()` call for HTTP,
  durable workers, or both.
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
    audit: { resolve: { type: "damat", path: "audit" } },
    auth: { resolve: "./src/modules/auth" },
  },
  providers: {
    auth: { module: "auth" },
  },
  links: "./src/links",
  runtime: {
    mode: "all", // "server" | "worker" | "all"
    workers: ["jobs", "events", "pipelines"],
    shutdownGraceMs: 30_000,
  },
  services: {
    durability: {
      acceleration: {
        healthySafetyPollIntervalMs: 30_000,
        degradedMaxPollIntervalMs: 5_000,
      },
    },
    jobs: { queue: "damat-jobs", concurrency: 4 },
    events: { durable: { concurrency: 4 } },
    pipelines: { concurrency: 2, routerBatchSize: 100 },
  },
});
```

String locations are project-relative editable source. Node and Damat package
locations resolve the artifact root, read `damat.json`, and load the same entry
and optional capabilities without copying them into app source. Packaged routes
mount below `/<module-id>` in the API router; workflow, job, event, and pipeline
providers load before selected workers start. Damat paths stay in
`.damat/packages`.

Each `providers` entry selects an already initialized module service for one
standardized role. The framework never creates a second service or database
context. Provider-owned persistence, credentials, routes, workflows, health,
and shutdown behavior use normal module/application mechanisms. Auth route
protection remains explicit through route config or `projectConfig.http.auth`.

`links` points at a directory whose `index.ts` default-exports `defineLinkModule(...)` and exports `models`. The framework registers it as a `link` module, so cross-module links boot, migrate, and type-generate alongside your modules.

A route file at `src/api/routes/users/[userId]/route.ts`:

```ts
import { defineRoute } from "@damatjs/framework/router";

export const GET = defineRoute<{ userId: string }>(async (c, params) => {
  return c.json({ success: true, data: { id: params.userId } });
});
```

Apply the durable system migrations before starting a process with jobs,
durable events, or pipelines:

```bash
damat-orm migrate:up
```

Entry point that boots the selected runtime:

```ts
import { start } from "@damatjs/framework";

await start();
```

`runtime.mode` defaults to `"all"`. Workers default to the enabled durable
capabilities: `services.jobs` enables `jobs`, `services.events.durable` enables
`events`, and `services.pipelines` enables `pipelines`. A `"server"` process never starts workers; a `"worker"`
process must select at least one enabled capability; an `"all"` process may
serve HTTP with no workers.

Deployment environment overrides are independent:

```bash
DAMAT_RUNTIME_MODE=worker DAMAT_WORKER_TYPES=jobs,events,pipelines bun run start
```

`DAMAT_RUNTIME_MODE` overrides `runtime.mode`. `DAMAT_WORKER_TYPES` overrides
`runtime.workers`; comma-separated values are trimmed and deduplicated. An
unknown mode or capability always fails startup. In `worker` and `all` modes,
selecting a known capability without its service config also fails startup. A
`server` process drops known worker selections because it never executes
workers.

One application process creates one PostgreSQL pool and gives that pool to
HTTP modules, jobs, event routing/delivery, inspection, the acceleration relay,
and maintenance. The pool may hold several physical connections up to its
configured `max`; sharing a pool does not mean setting `max: 1`.

PostgreSQL remains canonical. Redis stores rebuildable ready identifiers,
short-lived worker liveness, wake-ups, and inspection invalidations. Healthy
Redis removes one-second idle polling and leaves a 30-second PostgreSQL safety
scan; degraded mode discovers work within five seconds. The shared coordinator
serializes idle/background maintenance without blocking HTTP requests or active
handlers. Subscriber error events enter the same structured degradation path
as failed connection attempts. Use `getAccelerationHealth`,
`rebuildAccelerationProjection`, and
`subscribeDurableInvalidations` to integrate operational tooling.

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
    beforeRoutes: ({ app, config, logger }) => {}, // Hono app exists, no endpoint routes yet
    afterRoutes: ({ app, config, logger }) => {}, // all routes registered, before the 404 handler
  },
  services: {
    events: { broadcast: true }, // cross-process event delivery via Redis pub/sub (needs redisUrl)
    jobs: { concurrency: 4 }, // PostgreSQL durability; selected by runtime
    pipelines: { concurrency: 2 }, // graph router + internal node worker
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

Route-handler throws are turned into the framework's JSON error envelope automatically (bootstrap installs `app.onError` — in Hono v4 handler errors bypass middleware). The events, jobs, and shared durability packages are re-exported from the framework root, including their headless inspection clients. The framework does not mount operational administration routes; applications own authentication, authorization, and presentation.

## API

The package has many subpath exports. Import the narrowest one you need.

| Export                          | Kind   | Summary                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@damatjs/framework`            | barrel | Re-exports `bootstrap`, config/context/runtime/server/shutdown helpers, module registry helpers, `@damatjs/services`, link authoring, and all public events, jobs, and durability APIs, including headless inspection clients.                                                                                                            |
| `@damatjs/framework/entry`      | module | `start(cwd?, environment?)` — resolves and boots the selected runtime; `runEntry()` — `start()` with top-level error handling + `process.exit(1)`.                                                                                                                                                                                        |
| `@damatjs/framework/config`     | module | `defineConfig(config)`, `loadConfigAsync(cwd?)`, `loadConfig` (throws — use async), `clearConfigCache()`, and all config types (`AppConfig`, `ProjectConfig`, `HttpConfig`, `HttpRateLimitConfig`, `HttpAuthConfig`, `ModuleConfig`, `ServicesConfig`, `LifecycleHooks`).                                                                 |
| `@damatjs/framework/bootstrap`  | module | `bootstrap(options) => { app, config }` — builds the Hono app (middleware + file router + handlers) without starting it.                                                                                                                                                                                                                  |
| `@damatjs/framework/router`     | module | `createFileRouter(options)`, `defineRoute(handler)`, `response` helpers, `resolveMethodConfig`, the scanner (`scanDirectory`, `sortRoutes`, `folderToUrlPath`), and all router types (`RouteHandler`, `RouteModule`, `RouteModuleConfig`, `RouteValidator`, `AuthType`, `HttpMethod`, `FileRouter`, ...).                                 |
| `@damatjs/framework/middleware` | module | `setupMiddleware`, `errorHandler`, `notFoundHandler`, `requestSetup`, `createRateLimitMiddleware`, `createAuthMiddleware`, `corsConfigSetter`, `getErrorCodeFromStatus`, and `CorsConfigType`. (`validate`/`createValidatorMiddleware` live in `middleware/validator.ts` and are wired internally by the route builder, not re-exported.) |
| `@damatjs/framework/handlers`   | module | `createRootRoute`, `createApiRoutesRoute`, `createHealthRoute`, plus `HealthCheckOptions`/`HealthCheckFn`.                                                                                                                                                                                                                                |
| `@damatjs/framework/server`     | module | `startServer(app, config, logger)` — runs Hono and returns an idempotent async close handle.                                                                                                                                                                                                                                              |
| `@damatjs/framework/shutdown`   | module | Phased shutdown registry and runner: `setupShutdownHandlers`, `registerShutdown`, `runShutdownHandlers`, `ShutdownPhase`.                                                                                                                                                                                                                 |
| `@damatjs/framework/services`   | module | Service wiring: `initializeServices(config, cwd?, runtime)`, logger, database, Redis, modules, provider-role bindings, auth handlers, durable readiness, and selected workers. Includes typed `getProvider(role)`.                                                                                                                        |

Key types: `AppConfig`, `RuntimeConfig`, `RuntimeMode`, `WorkerCapability`,
`ResolvedRuntime`, `ProjectConfig`, `HttpConfig`, `LifecycleHooks`,
`BootstrapOptions`, `BootstrapResult`, `ServerConfig`, `HealthCheckConfig`,
`ShutdownRegistration`, `ShutdownPhase`, `RouteModule`, `RouteValidator`,
`AuthType`, `AuthUser`, `AuthTeam`, `ProviderBinding`, and `ProviderBindings`.

The barrel also ships `src/context.ts`: a `ContextVariableMap` augmentation (`requestId`, `startTime`, `logger`, plus optional `user`/`team`/`userId`) so `c.get(...)`/`c.set(...)` are fully typed in app code — no casts — with `getRequestLogger(c)`, `getUser(c)`, and `getTeam(c)` as typed accessors.

## How it fits

- **Dependencies:** `@damatjs/services`, `@damatjs/redis`, `@damatjs/logger`, `@damatjs/types`, `@damatjs/orm-connector`, `@damatjs/orm-type`, `@damatjs/workflow-engine`, `@damatjs/link`, `@damatjs/events`, `@damatjs/jobs`, `@damatjs/pipelines`, `@damatjs/deps`, and `@hono/node-server`.
- **In-repo dependents:** the reference app `@damatjs/default` (`backend/default`) imports `defineConfig`, `defineRoute`/`RouteHandler`, `ModuleService`, and `defineModule` from here. The framework's `services/database.ts` calls `PoolManager.setup(...)` from `@damatjs/services`, and `services/moduleService.ts` registers each app module.

## Documentation

- [Internals & architecture](./docs/README.md)
- [Bootstrap](./docs/bootstrap.md) · [Config](./docs/config.md) · [Router](./docs/router.md) · [Middleware](./docs/middleware.md) · [Handlers](./docs/handlers.md) · [Server & shutdown](./docs/server-and-shutdown.md) · [Services](./docs/services.md)
- [Full Damat guide](../../docs/GUIDE.md)

## License

MIT
