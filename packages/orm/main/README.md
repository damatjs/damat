# @damatjs/orm

> The umbrella package for the Damat ORM — one install, every ORM sub-package.

`@damatjs/orm` is a thin meta-package that re-exports the individual Damat ORM
packages (`model`, `connector`, `migration`, `processor`, `pg`) under a single
name and a set of subpath exports. It carries no logic of its own — every symbol
it exposes comes from a sub-package. Reach for it when you want the whole ORM in
one dependency; reach for the individual `@damatjs/orm-*` packages when you want
to depend on only one slice.

Part of the [Damat](../../../README.md) monorepo · [Full guide](../../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

```bash
# inside the monorepo, workspace protocol resolves to the local package
bun add @damatjs/orm@*

# from a published release
bun add @damatjs/orm
```

```ts
// the root export pulls in model + connector + migration + processor + pg
import {
  ConnectionManager,
  PgEntityManager,
  runMigrations,
} from "@damatjs/orm";

// or import just the slice you need via a subpath
import { columns, toModuleSchema } from "@damatjs/orm/model";
import { PgEntityManager } from "@damatjs/orm/pg";
```

## API

`@damatjs/orm` has no source of its own beyond `export *` lines. Each entry below
re-exports the named sub-package verbatim.

| Import path              | Re-exports               | Provides                                                                                                                |
| ------------------------ | ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `@damatjs/orm`           | all five below           | the entire ORM surface in one import                                                                                    |
| `@damatjs/orm/model`     | `@damatjs/orm-model`     | column/property DSL, schema builders, `toModuleSchema`, model types/utils                                               |
| `@damatjs/orm/connector` | `@damatjs/orm-connector` | `ConnectionManager` — pooled PostgreSQL connection lifecycle + health checks                                            |
| `@damatjs/orm/migration` | `@damatjs/orm-migration` | migration discovery, executor, generator, tracker (`runMigrations`, `createInitialMigration`, `createDiffMigration`, …) |
| `@damatjs/orm/processor` | `@damatjs/orm-processor` | schema diffing, SQL generation, snapshots (`diff`, `sqlGenerator`, `snapshotExist`)                                     |
| `@damatjs/orm/pg`        | `@damatjs/orm-pg`        | `EntityManager`/`PgEntityManager`, repository pattern, transactions, query executor                                     |

> The root `.` export is `export * from` all five sub-packages, so any symbol
> reachable through a subpath is also reachable through the bare `@damatjs/orm`
> import.

## When to use

- **Use `@damatjs/orm`** when you are building an app or a module and want the
  full ORM available behind a single dependency and a stable import name.
- **Use an individual `@damatjs/orm-*` package** when you only need one concern
  (e.g. a migration tool that only touches `@damatjs/orm-migration`, or a type
  generator that only needs `@damatjs/orm-model`). Depending on the slice keeps
  your dependency graph smaller and your intent explicit.
- The Damat CLIs depend on the individual packages, not on this umbrella — the
  umbrella is for downstream consumers.

## Quick start

```ts
import { ConnectionManager } from "@damatjs/orm/connector";
import { PgEntityManager } from "@damatjs/orm/pg";

const connection = new ConnectionManager({
  connectionString: process.env.DATABASE_URL!,
});
const pool = await connection.connect();

const em = new PgEntityManager(pool);
// use the repository / transaction API from @damatjs/orm-pg
```

```ts
import { runMigrations } from "@damatjs/orm/migration";
import { Pool } from "@damatjs/deps/pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const results = await runMigrations(pool, modules);
```

## How it fits

**Depends on** (all re-exported):

- `@damatjs/orm-migration`
- `@damatjs/orm-connector`
- `@damatjs/orm-model`
- `@damatjs/orm-processor`
- `@damatjs/orm-pg`
- `@damatjs/deps` (shared third-party deps such as `pg`)

**Consumed by**: application code and modules that want the whole ORM in one
dependency. The CLIs (`@damatjs/orm-cli`, `@damatjs/damat-cli`) wire to the
individual sub-packages directly rather than through this umbrella.

## Documentation

- [Internals](./docs/README.md) — what each subpath maps to and the re-export
  architecture.
- [Full guide](../../../docs/GUIDE.md) — the Damat monorepo guide.

## License

MIT
