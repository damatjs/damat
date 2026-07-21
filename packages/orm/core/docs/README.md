# @damatjs/orm-core — Internals

Maintainer notes for the database-agnostic runtime layer. This package is small
(four source files) but it is on the hot path of every driver: the registry is
consulted on every name→table resolution and the logger is called on every query.

## Module map

| Path              | Responsibility                                                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`    | Public barrel. Exports `ModelRegistry`, `ModelRegistryError`, `QueryLogger`, the three logger helpers, and the `QueryLoggerOptions` / `ModelRegistryEntry` types. |
| `src/registry.ts` | `ModelRegistry` + `ModelRegistryError`. The name/table index and relation resolver. See [registry.md](./registry.md).                                             |
| `src/logger.ts`   | `QueryLogger`, the global-singleton helpers, and `QueryLoggerOptions`. See [query-logger.md](./query-logger.md).                                                  |
| `src/types.ts`    | `ModelRegistryEntry` — the registry record shape.                                                                                                                 |

## Architecture overview

```
@damatjs/orm-model  ──►  ModelDefinition
                              │  register()
                              ▼
        ┌─────────────────────────────────────────┐
        │              @damatjs/orm-core            │
        │                                           │
        │   ModelRegistry          QueryLogger      │
        │   (name → entry,         (global          │
        │    table → name)          singleton)      │
        └─────────────────────────────────────────┘
              ▲                          ▲
              │ getModelRegistry()       │ getQueryLogger()
        @damatjs/orm-pg (entity managers, executors)
```

The package contains **no SQL and no connection logic**. It is the seam between
schema definitions and execution: a driver creates a `ModelRegistry`, populates
it from the app's models, and reads it during query construction; the same driver
calls the shared `QueryLogger` so all logging looks identical regardless of
operation.

## Data / control flow

1. At startup the app (or framework) registers models:
   `registry.registerMany({ User: UserSchema, ... })`.
2. For each model `register()` calls `model.toTableSchema()` once to extract the
   column names, then stores a `ModelRegistryEntry` and updates the
   `tableName → name` reverse index.
3. During query building the driver looks up entries by logical name
   (`get`) or table name (`getByTableName`), and resolves relation targets with
   `resolveRelation(model, property)`.
4. During execution the driver calls the global `QueryLogger`
   (`logQuery` / `logSlowQuery` / `logQueryError` / `logTransaction`).

## Key invariants & design decisions

- **`ModelRegistry` requires an `ILogger`.** The constructor takes one and uses
  it to debug-log every registration. There is no default — callers must supply
  a logger (drivers pass theirs in).
- **Two indexes, one source of truth.** `models: Map<name, entry>` is canonical;
  `tableNameIndex: Map<tableName, name>` is a derived reverse lookup. Both are
  written in `register()`. If you add another lookup dimension, write it there.
- **Columns are snapshotted at registration time.** `register()` calls
  `model.toTableSchema()` and stores `columns` as a plain `string[]`. If a model
  is mutated after registration the cached columns will be stale — register
  models _after_ they are fully defined.
- **`ModelRegistryError` is exported but not thrown here.** The registry's own
  methods return `undefined` on a miss; the error type exists so _consumers_
  (e.g. orm-pg entity managers) can throw a consistent error when a lookup must
  succeed. Keep returning `undefined` from registry getters; let callers decide
  whether a miss is fatal.
- **`QueryLogger` is a global singleton by default.** `getQueryLogger()` lazily
  constructs one; `setQueryLogger` / `configureQueryLogger` replace it. This lets
  any driver in the process share one logging configuration without threading a
  logger through every call. Per-instance loggers are still possible
  (`new QueryLogger(opts, logger)`).
- **All `QueryLogger` methods are gated by `enabled` + a per-category flag.**
  Adding a new log method should follow the same `if (!enabled || !category)
return;` guard pattern.

## Safely extending

- **Registry:** new lookup helpers belong on `ModelRegistry` and should read from
  the existing maps. If they need new state, populate it inside `register()` so
  `registerMany()` stays correct automatically.
- **`resolveRelation`:** it finds a relation by matching `r.from === propertyName`
  against each `RelationSchema`, then resolves `relation.to` (a table name) via the
  table index. See [registry.md](./registry.md) before changing it.
- **Logger:** add new categories as optional `QueryLoggerOptions` flags
  (defaulting to `true` in the constructor's `Required<>` fill-in) and gate the
  new method on them.
- **Tests:** `test` runs `bun test`. Unit tests live in `src/__tests__/`
  (`registry.test.ts`, `logger.test.ts`, `index.test.ts`, with shared
  `helpers.ts`) and cover the registry indexes/relation resolution and the
  logger's category gating and singleton helpers. Also exercise `@damatjs/orm-pg`,
  which consumes both classes, after non-trivial changes.

## Related

- [Package overview](../README.md)
- [`@damatjs/orm-model` internals](../../model/docs/README.md)
- [`@damatjs/orm-type` internals](../../type/docs/README.md)
- [Full guide](../../../../docs/GUIDE.md)
