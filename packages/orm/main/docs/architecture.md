# Architecture — @damatjs/orm

`@damatjs/orm` is an **umbrella / meta-package**. It exists to give consumers a
single dependency and a stable import name for the whole Damat ORM, while the
actual implementation stays split across focused `@damatjs/orm-*` packages.

## The re-export model

```
                         @damatjs/orm
                              │
         ┌───────────┬────────┼────────┬───────────┐
         ▼           ▼        ▼        ▼           ▼
   orm-model   orm-connector  orm-     orm-      orm-pg
   (./model)   (./connector)  migration processor (./pg)
                              (./migration)(./processor)
```

Every file under `src/` is one line:

```ts
// src/index.ts
export * from "@damatjs/orm-migration"
export * from "@damatjs/orm-connector"
export * from "@damatjs/orm-model"
export * from "@damatjs/orm-processor"
export * from "@damatjs/orm-pg"
```

```ts
// src/pg.ts
export * from "@damatjs/orm-pg"
```

`tsc` (see `package.json` `build`: `rm -rf dist tsconfig.tsbuildinfo && tsc`)
emits a `dist/<name>.js` + `dist/<name>.d.ts` per source file, and
`package.json#exports` maps each public subpath to its build output.

## Subpath map (source of truth: `package.json#exports`)

| Subpath | Source file | Re-exported package | What you get |
|---|---|---|---|
| `.` | `src/index.ts` | all five | the full ORM surface |
| `./model` | `src/model.ts` | `@damatjs/orm-model` | column/property DSL, `schema`, `toModuleSchema`, types, utils |
| `./connector` | `src/connector.ts` | `@damatjs/orm-connector` | `ConnectionManager` (pool lifecycle, health checks, stats) |
| `./migration` | `src/migration.ts` | `@damatjs/orm-migration` | discovery / executor / generator / tracker + log helpers |
| `./processor` | `src/processor.ts` | `@damatjs/orm-processor` | schema `diff`, `sqlGenerator`, snapshot helpers |
| `./pg` | `src/pg.ts` | `@damatjs/orm-pg` | `EntityManager` (`= PgEntityManager`), repository, transaction, executor, client |

### What each re-exported package contributes

- **`@damatjs/orm-model`** — the model definition layer: the fluent column
  builders, schema construction, and `toModuleSchema(name, models)` which turns
  a module's model map into a `ModuleSchema` consumed by codegen and migrations.
- **`@damatjs/orm-connector`** — `ConnectionManager`, a wrapper over `pg.Pool`
  that lazily creates the pool, retries connection, exposes health checks and
  pool stats, and accepts an optional `ILogger`.
- **`@damatjs/orm-migration`** — the module-based SQL migration system:
  `runMigrations`, `createInitialMigration`, `createDiffMigration`,
  `getMigrationStatus`, `discoverModels`, `discoverAllMigrations`, etc. Each
  module owns a `migrations/` folder of `.sql` files; a tracker table records
  what has been applied.
- **`@damatjs/orm-processor`** — internal schema processing used by the CLI and
  migration tools: diff detection between the live schema and the model
  definitions, SQL generation for the diff, and snapshot read/write
  (`snapshotExist`).
- **`@damatjs/orm-pg`** — the runtime query layer: `PgEntityManager` (aliased as
  `EntityManager`), the repository pattern, transactions, and the query
  executor/client.

## Why a meta-package

- **One dependency, one name.** Apps and modules can `import { … } from
  "@damatjs/orm"` without tracking five separate package names/versions.
- **Slices stay independent.** Tools that need only one concern (the ORM CLI's
  migration code, a standalone type generator) depend on the precise
  sub-package, so the dependency graph stays minimal.
- **Stable public surface.** The umbrella's `exports` map is the contract;
  sub-packages can be refactored internally as long as their exported names
  stay put.

## Gotchas

- **Adding a sub-package is a 4-touch change** (dependency, `src/<name>.ts`,
  `src/index.ts`, `exports`) — see the safe-extension checklist in
  [README.md](./README.md). Forgetting any one leaves a subpath that resolves at
  type-check time but fails at runtime (or vice-versa).
- **Name collisions are silent at authoring time** but break `export *`
  aggregation in `src/index.ts`. Keep the sub-packages' public names disjoint,
  or switch the offending line to a named, renamed re-export.
- **The CLIs do not consume this package.** If you change the umbrella, you do
  not affect `@damatjs/orm-cli` or `@damatjs/damat-cli`; they import the
  sub-packages directly.
