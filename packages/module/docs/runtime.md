# Runtime — module as a live app

Source: `src/runtime/start.ts`, `src/runtime/entry.ts`,
`src/runtime/appConfig.ts`, `src/runtime/locate.ts`, `src/runtime/types.ts`.

The runtime runs **one module package as a live HTTP app** — the framework's full
stack (middleware, file-based routes from the module's `api/routes` dir, health
checks), with just this module registered. This is what `damat module dev` boots,
and what in-process API tests start with `port: 0`.

## `startModuleApp`

```ts
function startModuleApp(options?: StartModuleAppOptions): Promise<RunningModuleApp>;
```

Step by step (`start.ts`):

1. `packageDir = options.packageDir ?? process.cwd()`.
2. `moduleDir = locateModuleDir(packageDir)` — finds `module.json` (see below).
3. `manifest = readModuleManifest(moduleDir)`.
4. `moduleConfig = await loadModuleConfig(packageDir)` (the author's `module.config.ts`).
5. `config = buildModuleAppConfig({ moduleDir, manifest, moduleConfig, port? })`.
6. `services = await initializeServices(config, packageDir)` — database + redis +
   logger + this module's registration. `logger = getLogger()`.
7. **Migrate** — if `config.projectConfig.databaseUrl` is set,
   `applyModuleMigrations(PoolManager.getPool(), moduleDir, manifest, logger)`.
   The module owns its schema, applied before serving.
8. **Health check** — if `services.healthChecks` exists, build
   `{ version: manifest.version ?? "0.0.0", checks }`.
9. `bootstrap({ routesDir: join(moduleDir, "api", "routes"), projectConfig, healthCheck? })`
   → `{ app, config: serverConfig }` (the Hono app).
10. `serve({ fetch: app.fetch, port: serverConfig.port }, cb)` and resolve once
    bound; log `"Module \"<name>\" running"` with the URL.
11. Return `RunningModuleApp` — `{ app, server, port, manifest, stop }`.

`stop()` closes the server, then runs every `services.shutdownHandlers` handler
(db/redis/logger), swallowing individual errors so they don't mask each other.

## `runModuleEntry`

```ts
function runModuleEntry(): Promise<void>;
```

The entry point `damat module dev` generates dev-entry files for. It just calls
`startModuleApp()` on the cwd and keeps the server running; on failure it logs and
`process.exit(1)`.

## `locateModuleDir`

```ts
function locateModuleDir(packageDir: string): string;
```

Finds the dir holding `module.json`:

1. `<packageDir>/src` if `src/module.json` exists (package layout).
2. else `<packageDir>` if `module.json` exists (legacy in-app layout).
3. else throw `"No module.json found in <pkg> or <pkg>/src — not a damat module package"`.

Used by the runtime *and* the tooling (`createModuleMigration`, `generateModuleTypes`).

## `buildModuleAppConfig` + `DEFAULT_MODULE_PORT`

```ts
const DEFAULT_MODULE_PORT = 7654;
function buildModuleAppConfig(input: BuildModuleAppConfigInput): AppConfig;
```

Builds a full framework `AppConfig` for running one module standalone:

```ts
const overrides = moduleConfig.projectConfig ?? {};
projectConfig = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL,
  nodeEnv: (process.env.NODE_ENV as ...) ?? "development",
  loggerConfig: { level: "debug", format: "pretty", timestamp: true, prefix: manifest.name },
  ...overrides,
  http: {
    host: process.env.HOST || "0.0.0.0",
    ...overrides.http,
    port: port
        ?? (process.env.PORT ? Number(process.env.PORT) : undefined)
        ?? overrides.http?.port
        ?? DEFAULT_MODULE_PORT,
  },
};
return { projectConfig, modules: { [manifest.name]: { resolve: moduleDir, id: manifest.name } } };
```

**Port precedence** (highest first): `options.port` → `PORT` env →
`module.config.ts` `http.port` → `7654`. Pass `port: 0` for an ephemeral port
(API tests read the bound port back from `RunningModuleApp.port`).

## Types

```ts
interface StartModuleAppOptions {
  packageDir?: string; // module package root (has package.json / module.config.ts). Default: cwd
  port?: number;       // override. Default: PORT env, module.config, then 7654. Use 0 for random.
}

interface RunningModuleApp {
  app: Hono;                 // for direct fetch-style testing
  server: ModuleServerHandle;// node server handle (matches @hono/node-server)
  port: number;              // the port actually bound
  manifest: ModuleManifest;
  stop(): Promise<void>;     // stop server + run all shutdown handlers
}

interface ModuleServerHandle { close(callback?: (err?: Error) => void): void; }
```

## Gotchas

- The runtime reads config from **two** places: `module.config.ts` from
  `packageDir`, and `module.json` from `moduleDir` (`src/` or root). They are not
  the same directory in the package layout.
- Migrations only run when `databaseUrl` is non-empty — an app started without
  `DATABASE_URL` serves routes but skips migrating (the empty-string default makes
  this a runtime condition, not a crash).
- Routes are file-based under `<moduleDir>/api/routes`; if that dir is absent the
  app still boots (health/middleware), it just serves no module routes.
- `stop()` must be awaited in tests to release the port and close db/redis;
  forgetting it leaks connections across test files.
