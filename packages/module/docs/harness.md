# Harness — standalone dev & test

Source: `src/harness/boot.ts`, `src/harness/with.ts`, `src/harness/types.ts`,
`src/harness/database.ts`, `src/harness/migrate.ts`.

The harness boots a single module **without an HTTP server** — it wires the same
infrastructure the framework uses in production (`ConnectionManager` +
`PoolManager`), applies the module's own migrations, calls `module.init()`, and
hands back the module's `service` for direct calls. This is what makes a module
developable and testable in its own repository before it is ever added to a
backend.

## `bootModule`

```ts
function bootModule<TService extends object>(
  module: BootableModule<TService>,
  options?: BootModuleOptions,
): Promise<BootedModule<TService>>;
```

Step by step (`boot.ts`):

1. **Logger** — `options.logger` or a new `Logger({ prefix: "module", timestamp: false })`.
2. **DB config** — `resolveDatabaseConfig(options)` (see below).
3. **Connect** — `new ConnectionManager(dbConfig, logger)` then `connect()` → `pool`.
4. **Shared state** — `PoolManager.reset()` then
   `PoolManager.setup({ pool, logger, connectionManager })`. The harness assumes
   it owns the process (one module at a time).
5. **Manifest + migrations** — only if `options.moduleDir` is set:
   `readModuleManifest(moduleDir)` then
   `applyModuleMigrations(pool, moduleDir, manifest, logger, options.migrate)`.
6. **Init** — `module.init()`.
7. **Return** `BootedModule`: `{ service, pool, connection, manifest, teardown }`.

`teardown` calls `PoolManager.reset()` and `connection.disconnect()`. **Always
call it** (use `withModule` to guarantee it).

## `withModule`

```ts
function withModule<TService extends object, R>(
  module: BootableModule<TService>,
  options: BootModuleOptions,
  fn: (booted: BootedModule<TService>) => Promise<R>,
): Promise<R>;
```

Boot → run `fn(booted)` → `finally` teardown. The convenience wrapper for tests
and scripts; `fn`'s return value is returned.

```ts
await withModule(
  userModule,
  { moduleDir: import.meta.dir },
  async ({ service }) => {
    const user = await service.user.create({ data: { email: "a@b.co" } });
    expect(user.id).toBeTruthy();
  },
);
```

## Types

### `BootableModule`

```ts
interface BootableModule<TService> {
  readonly name: string;
  readonly service: TService;
  init(): unknown;
}
```

A structural contract — it matches what `defineModule()` returns without binding
to a specific `@damatjs/services` version.

### `BootModuleOptions`

```ts
interface BootModuleOptions {
  databaseUrl?: string; // default: process.env.DATABASE_URL
  database?: DbPoolConfigWithExtras; // full pool config; takes precedence over databaseUrl
  moduleDir?: string; // abs path to dir with damat.json + migrations
  migrate?: boolean; // apply migrations on boot; default: true when moduleDir set
  logger?: ILogger;
}
```

### `BootedModule`

```ts
interface BootedModule<TService> {
  service: TService; // call your model/methods on it
  pool: Pool;
  connection: ConnectionManager;
  manifest: ModuleManifest | null; // parsed manifest when moduleDir was given
  teardown(): Promise<void>; // close db + reset shared state — always call
}
```

## Database resolution (`database.ts`)

```ts
function resolveDatabaseConfig(
  options: BootModuleOptions,
): DbPoolConfigWithExtras;
```

Precedence: `options.database` → `options.databaseUrl` → `process.env.DATABASE_URL`.
With a connection string it returns `{ ...testPoolConfig(), connectionString }`
(test-tuned pool). If none is available it throws:
`"bootModule needs a database: set DATABASE_URL or pass { databaseUrl } / { database }"`.

> `resolveDatabaseConfig` is **internal** — not re-exported from `harness/index.ts`.

## Migration application (`migrate.ts`)

```ts
function applyModuleMigrations(
  pool,
  moduleDir,
  manifest,
  logger,
  force?,
): Promise<void>;
```

1. Resolve the migrations dir: `manifest.paths?.migrations ?? "./migrations"`.
2. `shouldMigrate = force ?? existsSync(migrationsPath)` — i.e. run when forced,
   else only when the dir exists.
3. `runMigrations(pool, { [name]: { id, name, path: moduleDir, resolve: moduleDir } })`
   where `name = manifest.name ?? basename(moduleDir)`.
4. Log `"Migrations applied for module \"<name>\""`.

> `applyModuleMigrations` is **internal** to the package but is shared: the
> runtime (`start.ts`) imports it directly to migrate before serving.

## Gotchas

- The harness requires a real Postgres. In test suites gate with
  `describe.skipIf(!process.env.DATABASE_URL)`.
- `PoolManager` is global, shared state. The `reset()` on boot and teardown means
  you can't run two booted modules concurrently in one process — they'd stomp the
  shared pool. Boot/teardown sequentially.
- Without `moduleDir`, no migrations run and `manifest` is `null` — useful for
  pure-service tests where the schema already exists.
- `migrate: false` skips migrations even when `moduleDir` is set; `migrate: true`
  forces them even if the migrations dir doesn't exist yet (will error in
  `runMigrations` if there's nothing to run).
