# @damatjs/services

> The service layer for Damat modules: auto-generated CRUD per model, a shared connection pool, and typed, lazily-initialized module instances.

`@damatjs/services` turns a map of ORM model definitions into a fully-featured service class. `ModuleService({ models })` returns an abstract base class with one camelCased accessor per model (`service.user`, `service.account`, ...), each exposing `create` / `find` / `findMany` / `update` / `delete` / `softDelete` / `restore` / `count` / `exists` plus transactions and relation loading. `PoolManager` is the process-wide holder of the PostgreSQL pool and entity manager that those services bind to, and `defineModule` wraps a service class into a typed `ModuleInstance` whose service is a lazily-constructed `Proxy`.

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
const user = await svc.user.create({ data: { email: "a@b.com" }, returning: ["id"] });
const many = await svc.user.findMany({ where: { active: true }, take: 10, include: ["account"] });
await svc.user.softDelete({ where: { id: user.id } });
```

## API

| Export | Kind | Summary |
| --- | --- | --- |
| `ModuleService(config)` | factory | Builds an abstract base class from `{ models, credentialsSchema? }`. Returns a class with `em`, `getModels`, `transaction()`, and one `ModelMethods` accessor per model (camelCased key). |
| `ModelMethods<T>` | class | The per-model CRUD surface: `create`, `createMany`, `find`, `findMany`, `update`, `delete`, `softDelete`, `restore`, `count`, `exists`, plus relation loading and transaction binding. |
| `PoolManager` | static class | Process-wide holder of the `Pool`, `PgEntityManager`, and `ConnectionManager`. `setup`, `getPool`, `getPgEntityManager`, `getConnectionManager`, `healthCheck`, `getStats`, `isInitialized`, `reset`. State lives on `globalThis` so duplicate package copies share one pool. |
| `defineModule(name, definition)` | factory | Wraps a service class + credentials loader into a `ModuleInstance` whose `.service` is a lazy `Proxy`. Returns `{ name, service, credentials, init }`. |
| `ModuleDefinition<TService>` | type | `{ service: new (credentials) => TService; credentials: (env) => any }`. |
| `ModuleInstance<TService>` | type | `{ name; service; credentials; init() }`. |
| `ModuleRegistry` | interface | Empty interface apps augment via declaration merging so `getModule("user")` (in the framework) is typed. |
| `ModuleServiceConfig`, `ModelsMap`, `FindOptions`, `CreateOptions`, `CreateManyOptions`, `UpdateOptions`, `DeleteOptions`, `SoftDeleteOptions`, `CountOptions`, `ExistsOptions`, `ToCamelCase` | types | Configuration and per-method option types for the service layer. |
| `PoolManagerStats`, `ConnectionManagerLike` | types | Pool statistics and the minimal connection-manager shape `PoolManager` accepts. |
| `toCamelCase(name)` | util | Lowercases the first character only (`"UserService"` → `"userService"`); used to derive accessor names. |

This package has a single root export (`@damatjs/services`); there are no subpath exports.

## How it fits

- **Dependencies:** `@damatjs/orm-pg` (`PgEntityManager`, `PgRepository`, transactions), `@damatjs/orm-model` (`ModelDefinition`), `@damatjs/orm-type`, `@damatjs/orm-connector`, `@damatjs/deps` (zod), `@damatjs/types`, `@damatjs/logger`.
- **In-repo dependents:** `@damatjs/framework` depends on it and re-exports it; the framework's `PoolManager.setup(...)` (in `services/database.ts`) initializes the pool this package reads, and `registerModule` calls each module's `init()`.

## Documentation

- [Internals & architecture](./docs/README.md)
- [`ModuleService` & generated CRUD](./docs/module-service.md)
- [`PoolManager`](./docs/pool-manager.md)
- [`defineModule` & module instances](./docs/define-module.md)
- [Full Damat guide](../../docs/GUIDE.md)

## License

MIT
