# @damatjs/orm-core

> Database-agnostic model registry and query logging for the Damat ORM.

`@damatjs/orm-core` is the thin runtime layer that sits between the schema
definitions (`@damatjs/orm-model`) and the database driver (`@damatjs/orm-pg`).
It provides two facilities that every driver needs but that contain no SQL
themselves: a `ModelRegistry` that indexes `ModelDefinition`s by logical name and
by table name (and resolves relations), and a `QueryLogger` that drivers call to
log queries, slow queries, errors, and transaction boundaries. Because it knows
nothing about how queries are executed, it is fully database-agnostic — a driver
package supplies the execution, this package supplies the bookkeeping.

Part of the [Damat](../../../README.md) monorepo · [Full guide](../../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

```bash
bun add @damatjs/orm-core
```

Inside the monorepo it is referenced as a workspace dependency:

```jsonc
// package.json
{
  "dependencies": {
    "@damatjs/orm-core": "*",
  },
}
```

## When to use

Use this package when you are:

- Building or wiring an entity manager / repository layer that needs to look up
  models by name or by table name at runtime (`ModelRegistry`).
- Writing a database driver that should emit consistent query / slow-query /
  error / transaction logs (`QueryLogger`).
- Configuring ORM-wide logging once at startup
  (`configureQueryLogger` / `setQueryLogger`).

You would **not** use this package directly to:

- Define models — that is [`@damatjs/orm-model`](../model/README.md).
- Run SQL, build queries, or manage connections — that is the driver layer
  (`@damatjs/orm-pg`), which _uses_ this package internally.

In a typical app you rarely import `@damatjs/orm-core` yourself; the Postgres
driver and the framework wire it up. You reach for it directly when extending the
ORM's runtime plumbing.

## Quick start

```ts
import { ModelRegistry, configureQueryLogger } from "@damatjs/orm-core";
import { Logger } from "@damatjs/logger";
import { UserSchema, OrderSchema } from "./models";

// 1. Configure logging once, globally
configureQueryLogger({ slowQueryThreshold: 500 });

// 2. Build a registry (needs an ILogger)
const registry = new ModelRegistry(new Logger({ prefix: "ORM" }));

registry.registerMany({ User: UserSchema, Order: OrderSchema });

// 3. Look models up by logical name or table name
const user = registry.get("User"); // ModelRegistryEntry | undefined
const byTable = registry.getByTableName("user"); // same entry, indexed by table
const cols = registry.getColumns("User"); // ["id", "email", ...]

// 4. Resolve a relation target from a property name
const orders = registry.resolveRelation("User", "orders"); // Order's entry
```

```ts
import { getQueryLogger } from "@damatjs/orm-core";

// Inside a driver's execute path:
const log = getQueryLogger();
const start = Date.now();
try {
  // ...run sql...
  log.logQuery(sql, params);
  log.logSlowQuery(sql, Date.now() - start, params);
} catch (err) {
  log.logQueryError(err as Error, sql, params);
  throw err;
}
```

## API

Single entry point (`.`). Exports from `src/index.ts`:

| Export                                   | Kind     | Summary                                                                                                  |
| ---------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `ModelRegistry`                          | class    | Indexes `ModelDefinition`s by name and table name; resolves relations and column lists.                  |
| `ModelRegistryError`                     | class    | Error thrown by consumers when a model lookup fails (e.g. driver entity managers).                       |
| `QueryLogger`                            | class    | Structured logger for queries, slow queries, errors, and transactions.                                   |
| `getQueryLogger()`                       | function | Get (lazily creating) the global `QueryLogger` singleton.                                                |
| `setQueryLogger(logger)`                 | function | Replace the global singleton with a specific instance.                                                   |
| `configureQueryLogger(options, logger?)` | function | Build a new `QueryLogger` from options and install it as the global.                                     |
| `QueryLoggerOptions`                     | type     | Options: `enabled`, `logQueries`, `logErrors`, `logSlowQueries`, `slowQueryThreshold`, `logTransaction`. |
| `ModelRegistryEntry`                     | type     | `{ model, tableName, schema, columns }` — a registry record.                                             |

Key methods of `ModelRegistry`:

| Method                                | Summary                                                            |
| ------------------------------------- | ------------------------------------------------------------------ |
| `register(name, model)`               | Register one model; indexes by name and table name; logs at debug. |
| `registerMany(models)`                | Register a `Record<string, ModelDefinition>`.                      |
| `get(name)` / `getByTableName(table)` | Look up an entry.                                                  |
| `getColumns(name)`                    | Column names for a model (`[]` if unknown).                        |
| `getAll()`                            | The underlying `Map<string, ModelRegistryEntry>`.                  |
| `has(name)`                           | Membership check by logical name.                                  |
| `getTableNames()` / `getModelNames()` | List indexed table / model names.                                  |
| `resolveRelation(model, property)`    | Resolve the target entry for a relation property.                  |

## How it fits

**Runtime dependencies** (`package.json`):

- [`@damatjs/orm-model`](../model) — `ModelDefinition` (the thing being
  registered) and schema types.
- [`@damatjs/orm-type`](../type) — shared types.
- [`@damatjs/logger`](../../core/logger) — `ILogger` / `Logger` / `LogContext`.

**Notable in-repo dependents:**

- `@damatjs/orm-pg` — its entity managers construct a `ModelRegistry` and its
  raw/transaction executors call `getQueryLogger()` for logging.

## Documentation

- [Internals](./docs/README.md) — architecture, registry & logger deep-dive.
- [Full guide](../../../docs/GUIDE.md) — the Damat monorepo guide.

## License

MIT
