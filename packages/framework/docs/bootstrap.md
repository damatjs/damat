# Bootstrap

Source: `src/bootstrap/index.ts`, driven by `src/entry.ts`, types in `src/types.ts`.

## Responsibility

`bootstrap` assembles a ready-to-serve Hono `app` from config, route directory, and (optional) health checks. It is the step between "services are initialized" and "start the server". It does **not** start listening — that is `startServer`.

`entry.start()` is the orchestrator that calls config loading, service init, `bootstrap`, shutdown setup, and `startServer` in order.

## `bootstrap(options)`

```ts
export async function bootstrap(options: BootstrapOptions): Promise<BootstrapResult>;

interface BootstrapOptions {
  routesDir: string;                       // absolute path to scan for route.ts files
  projectConfig: ProjectConfig;            // port/host/cors/api/rateLimit/auth + nodeEnv
  healthCheck?: HealthCheckConfig;         // { version?, checks?: { database?, redis? } }
}

interface BootstrapResult {
  app: any;                                // a Hono instance
  config: ServerConfig;                    // { port, host?, nodeEnv? }
}
```

### Step by step (`bootstrap/index.ts`)

1. `const logger = getLogger()` and log `"Starting server..."` with the port.
2. `const app = new Hono()`.
3. `setupMiddleware({ app, logger, corsConfig: projectConfig.http.corsConfig })` — installs the global middleware stack (see [middleware.md](./middleware.md)).
4. `createFileRouter({ routesDir, debug: nodeEnv === "development", logger, rateLimit: http.rateLimit, auth: http.auth })` — scans and builds the file router (see [router.md](./router.md)). `debug` enables per-route logging.
5. Mount the file router at the API base: `app.route(http.api?.entryRouter ?? "/api", fileRouter.router)`.
6. **Dev-only:** if `nodeEnv === "development"`, log the formatted route list and mount `createRootRoute` (`/damat`) and `createApiRoutesRoute` (`/damat/api/routes`).
7. If `healthCheck` is provided, mount `createHealthRoute(healthCheck, http.api?.healthCheckRouter)` (default path `/health`).
8. `app.notFound(notFoundHandler)`.
9. Return `{ app, config: { port, host, nodeEnv } }`.

## `entry.start(cwd?)`

```ts
export async function start(cwd: string = process.cwd()): Promise<void>;
export async function runEntry(): Promise<void>;  // start() wrapped in try/catch -> process.exit(1)
```

Pipeline (`entry.ts`):

1. `config = await loadConfigAsync(cwd)`.
2. `services = await initializeServices(config)`.
3. Build `healthCheck` from `services.healthChecks` (with `version: "2.0.0"`), or `undefined`.
4. Resolve `routesDir = ${cwd}/${http.api?.entryRouterPath ?? "/src/api/routes"}`.
5. `{ app, config: serverConfig } = await bootstrap({ routesDir, projectConfig, healthCheck })`.
6. `setupShutdownHandlers(getLogger())`, then `registerShutdown(h)` for each `services.shutdownHandlers`.
7. `startServer(app, serverConfig, getLogger())`.

## Important types (`types.ts`)

```ts
interface ServerConfig { port: number; host?: string; nodeEnv?: string; }
interface HealthCheckFn { (): Promise<{ status: string; latency?: number; data?: any }>; }
interface HealthCheckConfig { version?: string; checks?: { database?: HealthCheckFn; redis?: HealthCheckFn }; }
interface ShutdownHandler { name: string; handler: () => Promise<void> | void; }
```

Note `BootstrapResult.app` is typed `any` (it is a Hono instance; the loose type avoids leaking Hono generics through the public API).

## Gotchas

- **`bootstrap` does not init services.** It calls `getLogger()` (which lazily inits a default logger if none exists) but assumes the pool/redis/modules were set up by `initializeServices` beforehand. Calling `bootstrap` standalone (e.g. in a test) gives you an app but no DB-backed behaviour unless you set up `PoolManager` yourself.
- **`routesDir` must be absolute** and is resolved by the caller (`entry.start` joins it with `cwd`). The scanner silently returns no routes if the directory doesn't exist (`scanDirectory` guards with `existsSync`), so a wrong path yields an empty API rather than an error.
- **Dev introspection leaks structure.** `/damat` and `/damat/api/routes` are intentionally dev-only; don't rely on them in production.
- **API base default is `/api`.** Override with `projectConfig.http.api.entryRouter`. The routes *directory* default is `/src/api/routes`, overridden with `http.api.entryRouterPath`.
