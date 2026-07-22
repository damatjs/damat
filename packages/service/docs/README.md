# @damatjs/services — Internals

Maintainer notes for the service layer. Three concerns: the `ModuleService` factory that generates CRUD classes, the `PoolManager` static that holds the shared pool, and `defineModule` that produces lazy, typed module instances.

## Module map

| File / dir                      | Responsibility                                                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/index.ts`                  | Barrel: `export * from "./manager" "./module" "./service"`.                                                                                                                    |
| `src/manager/pool.ts`           | `PoolManager` — process-wide holder of `Pool` / `PgEntityManager` / `ConnectionManager`, with state on `globalThis`. Plus `PoolManagerStats`, `ConnectionManagerLike`.         |
| `src/manager/index.ts`          | Re-exports `./pool`.                                                                                                                                                           |
| `src/service/module.ts`         | `ModuleService(config)` — the small class factory and public service surface.                                                                                                  |
| `src/service/moduleTypes.ts`    | Public constructor, instance, and generated model-accessor types returned by `ModuleService`.                                                                                  |
| `src/service/moduleState.ts`    | Per-instance base methods, stable accessors, and transaction state.                                                                                                            |
| `src/service/modelAccessors.ts` | `ModelMethods` construction and call-time-resolving stable accessors.                                                                                                          |
| `src/service/transaction.ts`    | AsyncLocalStorage transaction context, nesting, and executor isolation.                                                                                                        |
| `src/service/methods.ts`        | `ModelMethods<T>` — the per-model CRUD implementation (delegates to `PgRepository`) + relation loading.                                                                        |
| `src/service/cache.ts`          | `withTaggedCache`, `modelCacheTag` — the opt-in, Redis-backed read cache as a `Proxy` over `ModelMethods`.                                                                     |
| `src/service/events.ts`         | `withModelEvents`, `modelEventName`, `ModelEventPayload` — opt-in `<model>.created\|updated\|deleted` events on the `@damatjs/events` global bus.                              |
| `src/service/logging.ts`        | `withQueryLogging` — opt-in debug-level `query` log per CRUD call. **Not** in the barrel; internal to the factory.                                                             |
| `src/service/type.ts`           | Option types (`FindOptions`, `CreateOptions`, ...), `ModuleServiceConfig` (incl. the `cache` / `logQueries` / `events` switches), `ModelsMap`, `ToCamelCase`, `MAX_PAGE_SIZE`. |
| `src/service/index.ts`          | Re-exports `./cache` `./events` `./methods` `./module` `./type` (not `./logging`).                                                                                             |
| `src/module/define.ts`          | `defineModule(name, definition)` — wraps a service class into a `ModuleInstance` with a lazy `Proxy` service.                                                                  |
| `src/module/type.ts`            | `ModuleDefinition`, `ModuleInstance`, `ModuleCredentials`, `ModuleRegistry` (augmentation point).                                                                              |
| `src/module/index.ts`           | Re-exports `./define` `./type`.                                                                                                                                                |
| `src/util/string.ts`            | `toCamelCase` (first-char lowercase).                                                                                                                                          |
| `src/util/index.ts`             | Re-exports `./string`.                                                                                                                                                         |
| `src/tests/**`                  | `bun:test` suites for the pool (incl. lifecycle and `close`), `defineModule`, methods, cascade, cache, events, logging, types, and `toCamelCase`.                              |

## Architecture overview

```
defineModule(name, { service, credentials })
        │  builds a ModuleInstance whose .service is a Proxy
        │  (first access -> new service(parsedCredentials))
        ▼
class extends ModuleService({ models, credentialsSchema })   <-- the service class
        │  constructor:
        │    - parses credentials (zod)
        │    - asserts PoolManager.isInitialized()
        │    - PoolManager.getPgEntityManager()
        │    - registerModel() + new ModelMethods() per model,
        │      wrapped per config: cache -> events -> logging
        ▼
PoolManager  (globalThis-backed static)
        │  getPgEntityManager() -> PgEntityManager (from @damatjs/orm-pg)
        ▼
ModelMethods -> PgRepository (per model)  -> PostgreSQL
```

## Startup / initialization flow

The order matters; the framework enforces it at boot:

1. **Pool setup.** Something (the framework's `initDatabase`, or a test) calls `PoolManager.setup({ pool, logger, connectionManager })`. This constructs the `PgEntityManager` and stores all three on `globalThis`.
2. **Module registration.** The framework imports each module's default export (a `ModuleInstance` from `defineModule`) and calls `init()`, which **constructs** the service for the first time.
3. **Service construction.** The generated `ModuleService` constructor parses credentials. With models it asserts the pool is initialized, registers each model, and creates a per-instance base `ModelMethods` map. With no models it remains database-free.
4. **Use.** Accessing `service.<model>` returns a stable proxy. Each method call
   resolves the current async transaction's methods when present, otherwise the
   service instance's base methods.

## Request / call flow (per method)

`service.user.findMany({ where, include })`:

1. The `user` accessor returns its stable per-service proxy.
2. The proxy resolves the current transaction's `ModelMethods` when
   `findMany` is called, otherwise the base methods.
3. `findMany` calls `getRepository()` — returns the transactional repository if a transaction is active, else the entity manager's repository.
4. The repository runs the query; if `include` is set, `loadRelations` walks the model's `RelationSchema[]` and issues follow-up queries per relation (`belongsTo` / `hasMany` / `hasOne`).

## Invariants & design decisions

- **`PoolManager` state lives on `globalThis`, not class statics.** Keyed by `Symbol.for("damatjs.services.poolManager")`. This is deliberate: if two copies of `@damatjs/services` end up in one process (a linked dev package next to an installed one), class statics would be per-copy and the second copy would see an uninitialized pool. The global symbol guarantees a single shared pool/entity manager.
- **Construct-on-init, not cache-forever.** `defineModule`'s `init()` always constructs a fresh instance. After a `PoolManager.reset()` (tests, harness reboot), re-initializing yields a service bound to the _current_ pool instead of one holding a stale connection.
- **Model-backed construction requires an initialized pool.** The constructor throws `"PoolManager not initialized..."` when models exist and `PoolManager.isInitialized()` is false. `models: {}` is the service-only exception; database APIs remain unavailable.
- **Accessor names are camelCased model keys.** `toCamelCase` only lowercases the first character (`account` → `account`, `Verification` → `verification`, `APIKey` → `aPIKey`). It does **not** convert snake_case or kebab-case (see `module-service.md` gotchas).
- **Relation FK conventions are by-convention.** `loadRelation` infers FK column names (`<model>_id`) from relation metadata; non-standard FK naming will not resolve. See `module-service.md`.
- **Opt-in wrappers layer cache → events → logging.** Cache is innermost, logging outermost. So one `query` log line covers a cache hit and a database read alike, and a write's event fires only after the write succeeded and its cache invalidation ran. All three are `Proxy` wrappers over `ModelMethods`; with no config flag set nothing is wrapped and every call behaves exactly as before. Details in `module-service.md`.
- **Transaction state is async-local and per service instance.** Nested calls
  reuse one executor and method map, while concurrent calls cannot overwrite
  each other's executor or transaction-bound repositories. Stable accessors
  resolve that state at method-call time and fall back to base methods outside
  the callback.
- **Transaction executors have a bounded active lifetime.** The executor passed
  to each top-level callback is a fresh wrapper for durability composition,
  then invalidated after success or rollback. Retained executors cannot later
  bypass idempotency's transaction requirement, even if the ORM reuses its
  underlying transaction manager.
- **The generated class has an explicit public type.** Its declaration contains
  credentials, models, transactions, and generated model accessors, while the
  symbol used to resolve accessor state stays private to the implementation.
  Exported service subclasses therefore emit declarations through either
  `@damatjs/services` or the `@damatjs/framework` re-export.
- **`ModuleRegistry` is the typing seam.** Apps augment it via declaration merging so the framework's `getModule("user")` is typed. The interface ships empty.

## Build note

`package.json` build is `tsc && tsc-alias` because the service layer uses `@/...` path aliases (e.g. `import { toCamelCase } from "@/util/string"` in `service/module.ts`); `tsc-alias` rewrites those to relative paths in the emitted output. The local alias is declared in `tsconfig.json` (`paths: { "@/*": ["src/*"] }`).

## Split docs

- [`module-service.md`](./module-service.md) — the factory and generated CRUD methods in detail.
- [`pool-manager.md`](./pool-manager.md) — the shared pool holder.
- [`define-module.md`](./define-module.md) — lazy proxy init, `ModuleInstance` / `ModuleDefinition` / `ModuleRegistry`.
