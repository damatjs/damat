# @damatjs/orm-type

> Shared, dependency-free TypeScript types for the Damat ORM.

`@damatjs/orm-type` is the type vocabulary that every other Damat ORM package
speaks. It defines the interfaces and unions that describe a database
connection, a serialized schema (columns, tables, enums, foreign keys,
constraints, indexes, relations, modules), and the JSON descriptors for queries.
It ships **only types** — no runtime code, no classes, no functions — so it can
be imported anywhere (model DSL, query builder, migration engine, CLI, codegen)
without pulling in implementation. It sits at the very bottom of the ORM stack:
everything depends on it, it depends on almost nothing.

Part of the [Damat](../../../README.md) monorepo · [Full guide](../../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

```bash
bun add @damatjs/orm-type
```

Inside the monorepo it is referenced as a workspace dependency:

```jsonc
// package.json
{
  "dependencies": {
    "@damatjs/orm-type": "*"
  }
}
```

## When to use

Use this package when you need to:

- Annotate code that produces or consumes a Damat schema snapshot
  (`TableSchema`, `ColumnSchema`, `ModuleSchema`, `RelationSchema`, …).
- Type a database connection abstraction (`DbConnection`, `DbPoolConfig`,
  `TransactionOptions`, `PoolStats`).
- Type query JSON descriptors and clauses (`SelectDescriptor`, `WhereClause`,
  `OrderByClause`, …) when building or interpreting queries.
- Share a single source of truth for PostgreSQL `ColumnType` /
  `ForeignKeyAction` / `IndexType` unions across packages.

You would **not** use this package directly to:

- Define models — use [`@damatjs/orm-model`](../model/README.md), which re-exports
  every type here plus the fluent builders that produce them.
- Register models or log queries at runtime — use
  [`@damatjs/orm-core`](../core/README.md).
- Execute SQL — use the Postgres driver package (`@damatjs/orm-pg`).

In practice most application code gets these types transitively through
`@damatjs/orm-model` (which does `export * from "@damatjs/orm-type"`). Import
`@damatjs/orm-type` directly only in low-level ORM packages.

## Quick start

```ts
import type {
  TableSchema,
  ColumnSchema,
  ForeignKeySchema,
  DbPoolConfig,
} from "@damatjs/orm-type";

// Describe a connection
const config: DbPoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
};

// Describe a table schema by hand (normally produced by @damatjs/orm-model)
const fk: ForeignKeySchema = {
  name: "order_user_id_fk",
  columns: [{ name: "user_id", type: "text" }],
  referencedTable: "user",
  referencedColumns: ["id"],
  onDelete: "CASCADE",
};

const orders: TableSchema = {
  name: "order",
  columns: [
    { name: "id", type: "text", nullable: false, primaryKey: true },
    { name: "user_id", type: "text", nullable: false } satisfies ColumnSchema,
  ],
  foreignKeys: [fk],
};
```

## API

`@damatjs/orm-type` has a single entry point (`.`). It re-exports the `pg`
driver types from `@damatjs/deps` and four type groups: `connection`, `model`,
`query`, and `migration`.

### Re-exported driver types

| Export | Kind | Summary |
| --- | --- | --- |
| `Pool` | type | node-postgres `Pool` (from `@damatjs/deps/pg`). |
| `PoolClient` | type | A pooled client checked out for a transaction. |
| `QueryResultRow` | type | Row shape returned by the pg driver. |

### Connection types (`connection/`)

| Export | Kind | Summary |
| --- | --- | --- |
| `DbConnection` | interface | Connection abstraction: `pool`, `query`, `transaction`, `getClient`, `close`, `isConnected`, `getStats`. |
| `DbPoolConfig` | interface | Pool options (`connectionString`/host/port/user/…, `min`, `max`, timeouts, `ssl`). |
| `DbPoolConfigWithExtras` | type | `DbPoolConfig` plus `allowExitOnIdle`. |
| `DbConnectionConfig` | interface | `{ database: string \| DbPoolConfig }`. |
| `ConnectionStatus` | interface | `{ connected, poolStats, lastChecked }`. |
| `PoolStats` | interface | `{ totalCount, idleCount, waitingCount }`. |
| `TransactionOptions` | interface | `{ isolationLevel?, readOnly?, deferrable? }`. |
| `TransactionIsolationLevel` | type | `"READ UNCOMMITTED" \| "READ COMMITTED" \| "REPEATABLE READ" \| "SERIALIZABLE"`. |
| `EntityConstructor<T>` | type | `new () => T`. |
| `QueryContext` | interface | `{ schema?, timezone?, debug? }`. |

### Model / schema types (`model/`)

| Export | Kind | Summary |
| --- | --- | --- |
| `ColumnType` | type | Union of ~80 PostgreSQL SQL type names (`"integer"`, `"text"`, `"jsonb"`, …). |
| `ColumnSchema` | interface | A serialized column (name, type, nullability, default, length/scale, enum, array, …). |
| `TableSchema` | interface | A serialized table: columns, indexes, foreignKeys, constraints, relations. |
| `ModuleSchema` | interface | A collection of tables + enums + hoisted relationships. |
| `EnumSchema` | interface | Named PG enum (`name`, `values`, optional `schema`). |
| `IndexType` | type | `"btree" \| "hash" \| "gin" \| "gist" \| "brin"`. |
| `IndexSchema` / `IndexColumn` | interface | Index definition and per-column order. |
| `ConstraintType` / `ConstraintSchema` | type | `unique` / `primary_key` / `check` / `exclude` constraint union. |
| `UniqueConstraint`, `PrimaryKeyConstraint`, `CheckConstraint`, `ExcludeConstraint` | interface | Per-kind constraint shapes. |
| `ForeignKeyAction` | type | `"CASCADE" \| "SET NULL" \| "SET DEFAULT" \| "RESTRICT" \| "NO ACTION"`. |
| `ForeignKeySchema` / `ForeignKeyType` / `ForeignKeySchemaMatch` | type | FK constraint, FK column (`{name,type}`), and `"SIMPLE" \| "FULL"`. |
| `RelationType` / `RelationSchema` | type | `belongsTo`/`hasMany`/`hasOne` and the module-level relation record. |
| `RelationOptions`, `LinkConfig`, `ConstraintOptions` | interface | Builder-level option payloads consumed by the model DSL. |
| `OrmModule` / `OrmModuleContainer` | interface | Module manifest entry and keyed container. |

### Query types (`query/`)

| Export | Kind | Summary |
| --- | --- | --- |
| `WhereOperators` | type | Operator union: `eq`, `neq`, `gt/gte/lt/lte`, `like/ilike`, `in/notIn`, `isNull/isNotNull`, `between`. |
| `WhereClause<Cols>` / `WhereConditionValue` | type | Column→condition map and a single condition value. |
| `RawWhereClause` | interface | `{ sql, params? }` escape hatch. |
| `OrderByClause` / `OrderDirection` | interface/type | Order spec and `"ASC" \| "DESC"`. |
| `BuiltQuery` | interface | `{ sql, params }` — output of a query builder. |
| `SelectDescriptor`, `InsertDescriptor`, `UpdateDescriptor`, `DeleteDescriptor`, `UpsertDescriptor` | interface | JSON descriptors per operation. |
| `QueryDescriptor` | type | Discriminated union of the five descriptors above. |
| `RelationDescriptor` | interface | Nested-load descriptor used inside `SelectDescriptor.with`. |
| `WhereConditionJson` / `OrderByJson` | type/interface | Serializable counterparts of the clause types. |

### Migration types (`migration/`)

| Export | Kind | Summary |
| --- | --- | --- |
| `OrmModule` | interface | `{ id, name, path, resolve, kind? }` module manifest entry. `kind?: "module" \| "link"` tags a cross-module link directory (`"link"`); ordinary modules leave it `undefined`. |
| `OrmModuleContainer` | interface | `{ [key]: OrmModule }` keyed module map. |

> Both `OrmModule` and `OrmModuleContainer` live under `migration/index.ts`. The
> `module.ts` file under `model/` defines `ModuleSchema` (schema snapshot), which
> is unrelated to the migration `OrmModule` manifest type.

## How it fits

**Runtime dependencies** (`package.json`):

- [`@damatjs/deps`](../../deps) — re-exports the `pg` driver types (`Pool`,
  `PoolClient`, `QueryResultRow`) via the `@damatjs/deps/pg` subpath.

**Notable in-repo dependents:**

- [`@damatjs/orm-model`](../model) — re-exports every type here and provides the
  builders that produce `TableSchema` / `ModuleSchema`.
- [`@damatjs/orm-core`](../core) — registry & logger.
- `@damatjs/orm-pg`, `@damatjs/orm-processor`, `@damatjs/orm-connector`,
  `@damatjs/orm-migration`, `@damatjs/orm-codegen`, `@damatjs/orm-cli` — the
  driver, query, migration, and tooling layers.
- `@damatjs/framework`, `@damatjs/module`, `@damatjs/service` — higher-level
  framework packages.

## Documentation

- [Internals](./docs/README.md) — type-group map and design notes for maintainers.
- [Full guide](../../../docs/GUIDE.md) — the Damat monorepo guide.

## License

MIT
