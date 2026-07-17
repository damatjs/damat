# @damatjs/services

> The service layer for Damat modules: auto-generated CRUD per model, a shared connection pool, and typed, lazily-initialized module instances.

`@damatjs/services` turns a map of ORM model definitions into a fully-featured service class. `ModuleService({ models })` returns an abstract base class with one camelCased accessor per model (`service.user`, `service.account`, ...), each exposing `create` / `createMany` / `upsert` / `upsertMany` / `find` / `findById` / `findOne` / `findMany` / `update` / `updateOne` / `delete` / `softDelete` / `restore` / `count` / `exists` plus transactions, cascade delete, and relation loading. `PoolManager` is the process-wide holder of the PostgreSQL pool and entity manager that those services bind to, and `defineModule` wraps a service class into a typed `ModuleInstance` whose service is a lazily-constructed `Proxy`.

It sits between the ORM packages (`@damatjs/orm-pg`, `@damatjs/orm-model`, `@damatjs/orm-type`) and `@damatjs/framework`, which wires the pool and registers modules at startup.

Part of the [Damat](../../README.md) monorepo · [Full guide](../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

```bash
bun add @damatjs/services
```

Inside the monorepo it is referenced via the workspace protocol (`"@damatjs/services": "*"`). Note: `@damatjs/framework` re-exports this package's entire surface (`export * from "@damatjs/services"`), so apps that already use the framework typically import `ModuleService` / `defineModule` from `@damatjs/framework`.

## When to use

Use it when:

- You are defining a Damat domain module and want CRUD methods generated from your ORM models.
- You need transactions that span several models in the module, or relation loading (`include`).
- You need to share one PostgreSQL pool / entity manager across all services in the process (`PoolManager`).

Do **not** use it:

- As a general-purpose ORM — model definitions come from `@damatjs/orm-model`; this package consumes them.
- Without initializing a pool first — instantiating a generated service throws unless `PoolManager.setup({ pool, logger, connectionManager })` has run (the framework does this for you when `databaseUrl` is configured).

## Quick start

```ts
import { ModuleService, defineModule } from "@damatjs/services";
import { z } from "@damatjs/deps/zod";
import { UserModel, AccountModel } from "./models";

// 1. Map model name -> ModelDefinition
const models = { user: UserModel, account: AccountModel };

// 2. Generate the base class (optionally with a credentials schema)
export class UserModuleService extends ModuleService({
  models,
  credentialsSchema: z.object({ apiKey: z.string() }),
}) {
  // add custom methods that use the generated accessors:
  async createWithAccount(email: string) {
    return this.transaction(async () => {
      const user = await this.user.create({ data: { email } });
      await this.account.create({ data: { user_id: user.id } });
      return user;
    });
  }
}

// 3. Wrap it as a typed, lazily-initialized module instance
export default defineModule("user", {
  service: UserModuleService,
  credentials: (env) => ({ apiKey: env.API_KEY ?? "" }),
});
```

Generated accessors are camelCased from the model key (`account` → `service.account`, `Verification` → `service.verification`):

```ts
const svc = new UserModuleService({ apiKey: "..." });
const user = await svc.user.create({
  data: { email: "a@b.com" },
  returning: ["id"],
});
const many = await svc.user.findMany({
  where: { active: true },
  take: 10,
  include: ["account"],
});

// insert-or-update on a unique column, and update returning the single row
await svc.user.upsert({
  data: { email: "a@b.com", name: "Ada" },
  onConflict: ["email"],
});
const updated = await svc.user.updateOne({
  where: { id: user.id },
  data: { name: "Grace" },
});
const byId = await svc.user.findById(user.id);

// remove the user and everything reachable via hasMany/hasOne, atomically
await svc.user.delete({ where: { id: user.id }, cascade: true });
```

## Transactions

`transaction` passes a structural PostgreSQL executor to its callback. A
callback may omit the parameter when it only uses transaction-bound accessors:

```ts
await svc.transaction(async (executor) => {
  await svc.user.create({ data: { email: "a@b.com" } });
  await executor.query("INSERT INTO audit_records (action) VALUES ($1)", [
    "user.created",
  ]);
});
```

Nested calls reuse the active executor and transaction-bound model accessors.
AsyncLocalStorage isolates overlapping calls, so concurrent transactions on one
service instance never share an executor or `ModelMethods`. Different service
instances also own separate base accessors. `inTransaction` reports the state
of the current asynchronous call chain rather than a mutable instance flag.

Model accessors are stable proxies that resolve the active repository when a
method is called. An accessor or method captured before a transaction therefore
uses that transaction inside its callback, and an accessor retained afterward
falls back to the base repository. Each top-level transaction receives a fresh
active executor wrapper, so it can be passed to `withIdempotency`; retaining it
after success or rollback is rejected even when the ORM reuses its underlying
transaction manager.
`TransactionOptions`, including the isolation level, are forwarded to the ORM.

## API

| Export                                                                                                                                                                                                                               | Kind          | Summary                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ModuleService(config)`                                                                                                                                                                                                              | factory       | Builds an abstract base class from `{ models, credentialsSchema?, cache?, logQueries?, events? }`. Returns a class with `em`, `getModels`, executor-aware `transaction()`, and one ModelMethods accessor per model (camelCased key).                                                                                             |
| `ModuleServiceConstructor`, `ModuleServiceInstance`, `ModelAccessors`                                                                                                                                                                | types         | Public generated-service types; internal accessor-resolution state is excluded so exported subclasses emit portable declarations through either package root.                                                                                                                                                                    |
| `ModelMethods<T>`                                                                                                                                                                                                                    | class         | The per-model CRUD surface: `create`, `createMany`, `upsert`, `upsertMany`, `find`, `findById`, `findOne`, `findMany`, `update`, `updateOne`, `delete` (optional `cascade`), `softDelete` (optional `cascade`), `restore`, `count`, `exists`, plus relation loading and transaction binding.                                     |
| `PoolManager`                                                                                                                                                                                                                        | static class  | Process-wide holder of the `Pool`, `PgEntityManager`, and `ConnectionManager`. `setup`, `getPool`, `getPgEntityManager`, `getConnectionManager`, `healthCheck`, `getStats`, `isInitialized`, `reset`, `close` (drains and ends the pg pool; idempotent). State lives on `globalThis` so duplicate package copies share one pool. |
| `defineModule(name, definition)`                                                                                                                                                                                                     | factory       | Wraps a service class + credentials loader into a `ModuleInstance` whose `.service` is a lazy `Proxy`. Returns `{ name, service, credentials, init }`.                                                                                                                                                                           |
| `ModuleDefinition<TService>`                                                                                                                                                                                                         | type          | `{ service: new (credentials) => TService; credentials: (env) => any }`.                                                                                                                                                                                                                                                         |
| `ModuleInstance<TService>`                                                                                                                                                                                                           | type          | `{ name; service; credentials; init() }`.                                                                                                                                                                                                                                                                                        |
| `ModuleRegistry`                                                                                                                                                                                                                     | interface     | Empty interface apps augment via declaration merging so `getModule("user")` (in the framework) is typed.                                                                                                                                                                                                                         |
| `ModuleServiceConfig`, `ModelsMap`, `FindOptions`, `CreateOptions`, `CreateManyOptions`, `UpsertOptions`, `UpsertManyOptions`, `UpdateOptions`, `DeleteOptions`, `SoftDeleteOptions`, `CountOptions`, `ExistsOptions`, `ToCamelCase` | types         | Configuration and per-method option types for the service layer.                                                                                                                                                                                                                                                                 |
| `withTaggedCache(methods, model, config)`, `modelCacheTag(model)`                                                                                                                                                                    | function      | The opt-in Redis read cache (applied automatically by `ModuleService` when the config carries `cache`) and the implicit invalidation tag a model's cached reads carry.                                                                                                                                                           |
| `CacheReadOptions`, `ServiceCacheConfig`                                                                                                                                                                                             | types         | Per-call `cache: { ttl?, tags? }` read options and the service-level cache switch `{ defaultTtl?, prefix? }`.                                                                                                                                                                                                                    |
| `withModelEvents(methods, model)`, `modelEventName(model, kind)`                                                                                                                                                                     | function      | The opt-in CRUD event wrapper (applied automatically when the config carries `events: true`) and the `<model>.<kind>` name a write emits.                                                                                                                                                                                        |
| `ModelEventPayload`                                                                                                                                                                                                                  | type          | `{ model, method, result }` — the payload every model CRUD event carries.                                                                                                                                                                                                                                                        |
| `PoolManagerStats`, `ConnectionManagerLike`                                                                                                                                                                                          | types         | Pool statistics and the minimal connection-manager shape `PoolManager` accepts.                                                                                                                                                                                                                                                  |
| `toCamelCase(name)`                                                                                                                                                                                                                  | internal util | Lowercases the first character only (`"UserService"` → `"userService"`); used internally to derive accessor names. Lives in `src/util/string.ts` and is **not** re-exported from `@damatjs/services`.                                                                                                                            |

This package has a single root export (`@damatjs/services`); there are no subpath exports.

## Query safety & conventions

The `ModelMethods` read/write surface enforces a few guarantees so a
request-derived options object can't reach the SQL layer with more authority
than intended:

- **Pagination.** `take`/`skip` map to SQL `LIMIT`/`OFFSET`. `take` is a
  non-negative integer capped at `MAX_PAGE_SIZE` (1000); a fractional or
  negative `take`/`skip` throws. (Passing no `take` still returns all matching
  rows — paginate explicitly for large tables.)
- **Option allow-listing.** `find`/`findMany`/`delete` forward only their known
  option keys. Raw-SQL (`whereRaw`) and full-table (`allowFullTable`) escape
  hatches are _not_ reachable through the service layer — use the underlying
  `@damatjs/orm-pg` repository directly when you deliberately need them.
- **`orderBy` validation.** `direction` is restricted to `ASC`/`DESC` and
  `nulls` to `NULLS FIRST`/`NULLS LAST` (both string-interpolated in SQL, so
  they're whitelisted rather than trusted).
- **Soft-delete filtering.** On a soft-delete model every read
  (`find`/`findMany`/`count`/`exists`) adds `deleted_at IS NULL` automatically.
  Pass `withDeleted: true` to include archived rows, or filter on the
  soft-delete column yourself to override.
- **`updated_at` maintenance.** `update`/`updateOne` stamp the model's
  `updated_at`/`updatedAt` column with the current time unless you set it
  explicitly. Auto-timestamps are `timestamp with time zone` (sub-second),
  not `date`.

## Read caching (opt-in, Redis-backed)

The Next.js fetch-cache model applied to the service layer: nothing is cached
by default, a read opts in per call, and writes invalidate automatically.

```ts
// 1. Enable the machinery on the service (off without this):
class UserService extends ModuleService({
  models,
  cache: { defaultTtl: 60, prefix: "user" }, // seconds; prefix namespaces keys
}) {}

// 2. Choose per read where the data comes from:
await svc.user.findMany({ where: { active: true } });                  // DB, as always
await svc.user.findMany({ where: { active: true }, cache: true });     // cached, defaultTtl
await svc.user.findMany({
  where: { active: true },
  cache: { ttl: 300, tags: ["homepage"] },                             // time-based + custom tag
});

// 3. Writes invalidate the model's cached reads automatically:
await svc.user.create({ data: { … } });   // drops every cached `user` read

// 4. Manual reset (custom tags / cross-model groups):
import { invalidateCacheTags } from "@damatjs/redis"; // re-exported by @damatjs/framework
await invalidateCacheTags(["homepage"]);
```

Semantics worth knowing:

- Works on `find`/`findMany`/`findById`/`findOne`/`count`/`exists`; every
  entry carries the implicit `model:<name>` tag plus any custom `tags`.
- All of `create/createMany/upsert/upsertMany/update/updateOne/delete/`
  `softDelete/restore` invalidate the model tag after they succeed.
- **Fail-open**: Redis missing or down never breaks a read — it falls through
  to the database with a debug log. Reads inside `transaction()` always hit
  the database (a transaction must see its own writes).
- `null` results are not cached (a cached `null` would be indistinguishable
  from a miss); `false`/`0` results are.
- Keys are stable hashes of the (cache-stripped) call arguments — the same
  filter written in a different key order addresses the same entry.

## Query logging & model events (opt-in)

Two more per-service config switches, both off by default:

```ts
class UserService extends ModuleService({
  models,
  logQueries: true, // one debug `query` log per CRUD call
  events: true, // <model>.created|updated|deleted on the global bus
}) {}
```

- **`logQueries: true`** — every CRUD call emits one debug-level `query` log
  with `{ model, method, durationMs }` (also when the call throws). No SQL
  text or parameter values are ever logged — payloads may carry PII.
- **`events: true`** — every **successful** write emits a
  `<model>.created|updated|deleted` event on the `@damatjs/events` global bus
  with payload `{ model, method, result }`. `create`/`createMany` →
  `created`; `update`/`updateOne`/`upsert`/`upsertMany`/`restore` →
  `updated`; `delete`/`softDelete` → `deleted`. Emission is awaited before
  the write call returns; subscriber errors are isolated by the bus, never
  thrown back into the write.

```ts
import { getEventBus } from "@damatjs/events";
getEventBus().on("user.created", async (payload) => {
  // { model: "user", method: "create", result: <the created row(s)> }
});
```

The wrappers stack cache innermost → events → logging outermost, so a
`query` log line covers cache hits and misses alike, and events fire after
the write's cache invalidation has run.

## How it fits

- **Dependencies:** `@damatjs/durability` (`DurabilityExecutor`),
  `@damatjs/orm-pg` (`PgEntityManager`, `PgRepository`, transactions),
  `@damatjs/orm-model` (`ModelDefinition`), `@damatjs/orm-type`,
  `@damatjs/orm-connector`, `@damatjs/deps` (zod), `@damatjs/types`, and
  `@damatjs/logger`.
- **In-repo dependents:** `@damatjs/framework` depends on it and re-exports it; the framework's `PoolManager.setup(...)` (in `services/database.ts`) initializes the pool this package reads, and `registerModule` calls each module's `init()`.

## Documentation

- [Internals & architecture](./docs/README.md)
- [`ModuleService` & generated CRUD](./docs/module-service.md)
- [`PoolManager`](./docs/pool-manager.md)
- [`defineModule` & module instances](./docs/define-module.md)
- [Full Damat guide](../../docs/GUIDE.md)

## License

MIT
