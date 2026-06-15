# @damatjs/orm-pg

> PostgreSQL execution layer for Damat — EntityManager, the Repository pattern, a typed query builder, and transactions over a `pg` Pool.

`@damatjs/orm-pg` is the SQL-executing core of Damat's ORM. Given a model definition
(`@damatjs/orm-model`) and a node-postgres `Pool` (from `@damatjs/orm-connector`), it builds
parameterised SQL, runs it, and returns typed rows. It provides three layers you can drop into at any
depth: a high-level `PgEntityManager` with cached `PgRepository` instances and transactions, a
per-model `PgModelClient` for `find/create/update/delete/upsert`, and a low-level query builder
(`SelectBuilder`, `InsertBuilder`, …) plus a `ModelAccessor` that emits both SQL and a JSON
descriptor for every operation. It sits directly below `@damatjs/orm-main`/`@damatjs/service` and
directly above `@damatjs/orm-connector`.

Part of the [Damat](../../../README.md) monorepo · [Full guide](../../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

```bash
bun add @damatjs/orm-pg
```

Inside the Damat monorepo this package is referenced with the workspace protocol — `"@damatjs/orm-pg": "*"` in a dependent's `package.json` — so the local source is always linked instead of a published version.

## When to use

Use this package when you need to:

- Run CRUD against Postgres from Damat model definitions with typed results.
- Use the Repository pattern (`findMany`, `findOne`, `findById`, `create`, `update`, `delete`, `upsert`, `count`, `exists`).
- Run transactions with model accessors and savepoints (`em.transaction(tx => …)`).
- Eager-load relations (`with: { … }`) compiled into `LEFT JOIN LATERAL` subqueries returning JSON.
- Get a JSON descriptor of any query (for inspection, caching keys, or transformation) alongside its SQL.

Do **not** use it when:

- You only need to manage the connection/pool — that's `@damatjs/orm-connector`.
- You want the all-in-one facade — depend on `@damatjs/orm-main` (re-exports this package and the connector).
- You need migrations or codegen — see `@damatjs/orm-processor` / `@damatjs/orm-codegen`.

## Quick start

```ts
import { ConnectionManager, productionPoolConfig } from "@damatjs/orm-connector";
import { model, columns } from "@damatjs/orm-model";
import { PgEntityManager } from "@damatjs/orm-pg";

// 1. A model.
const User = model("user", {
  id: columns.text().primaryKey(),
  email: columns.varchar().length(255).unique(),
  name: columns.text().nullable(),
  verified: columns.boolean().default(false),
});

// 2. A pool.
const cm = new ConnectionManager(productionPoolConfig({ connectionString: process.env.DATABASE_URL }));
const pool = await cm.connect();

// 3. The entity manager — register models, then get repositories.
const em = new PgEntityManager({ pool });
em.registerModel("user", User);

const users = em.repo("user"); // alias for getRepository("user")

await users.create({ data: { id: "usr_1", email: "a@b.com", name: "Alice" } });

const alice = await users.findOne({ where: { email: "a@b.com" } });
const verified = await users.findMany({
  where: { verified: true, name: { ilike: "a%" } },
  orderBy: [{ column: "name", direction: "ASC" }],
  limit: 10,
});

// 4. Transactions — accessors (tx.user) and repo(name) both work inside.
await em.transaction(async (tx) => {
  await tx.repo("user").update({ set: { verified: true }, where: { id: "usr_1" } });
  await tx.createSavepoint("sp1");
  // throw to roll back automatically
});

// 5. Standalone per-model client (no entity manager needed).
import { PgModelClient } from "@damatjs/orm-pg";
const client = new PgModelClient(User, pool);
const { rows, descriptor } = await client.findMany({ select: ["id", "email"] });
```

## API

Exported from the package root (`@damatjs/orm-pg`):

| Export | Kind | Summary |
| --- | --- | --- |
| `PgEntityManager` | class | Top-level manager: caches `PgRepository` per model, runs transactions, raw SQL. `registerModel` / `getRepository` / `repo` / `transaction` / `tx` / `raw` / `execute`. |
| `EntityManager` | const | Alias of `PgEntityManager` (`export const EntityManager = PgEntityManager`). |
| `TransactionalEntityManager` | class | The `tx` object inside `em.transaction(...)`: dynamic model accessors (`tx.user`), `repo`, `query`, savepoint methods. |
| `EntityManagerError`, `QueryExecutionError` | class | Errors thrown by the manager layer. |
| `TransactionManager` | class | Owns BEGIN/COMMIT/ROLLBACK over a pooled client; validates isolation level; `begin` / `run`. |
| `TransactionContext` | class | A live transaction: `query`, `commit`, `rollback`, `createSavepoint` / `rollbackToSavepoint` / `releaseSavepoint`, `getClient`, `release`. |
| `TransactionError`, `TransactionContextError` | class | Errors thrown by the transaction layer. |
| `PgRepository`, `PgRepositoryConfig` | class / type | Repository over a model: `findMany/findOne/findById/findManyByIds/create/createMany/update/updateOne/delete/deleteById/upsert/count/exists`. |
| `createRepository` | function | Factory building a `PgRepository` from a model + connection (`Pool` / `PoolClient` / `{ getPool }`). |
| `pgExecuteRaw` | function | Executes a `BuiltQuery` against a `Pool`/`PoolClient`, with query/slow/error logging. |
| `pgTransaction` | function | Runs a callback inside BEGIN/COMMIT/ROLLBACK on a pooled client. |
| `PgModelClient` | class | Per-model CRUD over a connection; returns `{ rows, rowCount, descriptor }`. `findMany/findOne/create/createMany/update/delete/upsert/transaction/withClient`. |
| `ModelAccessor` | class | Pure query factory: each method returns `{ sql: BuiltQuery, json: Descriptor }`. Exposes `builders.{select,insert,update,delete,upsert}`. |
| `SelectBuilder`, `InsertBuilder`, `UpdateBuilder`, `DeleteBuilder`, `UpsertBuilder` | class | The low-level query builders (chainable; `generateSql()` / `generateJson()`). |
| `QueryBase` | class | Abstract base for the builders (where/orderBy/returning + column-existence asserts). |
| query helpers | functions | `quoteIdent`, `buildTableRef`, `assembleQuery`, `buildWhereClause`, `buildOrderByClause`, `buildReturningClause`, `compileCondition`, `assertKnownColumns`, … |
| relations | functions | `resolveModelRelations`, `assertValidRelationMap`, `getModelRelationNames`, `buildLateralJoin`, `compileRelCondition`, `RelationGuardError`. |

Key exported types: `PgEntityManagerConfig`, `FindOptions`, `CreateOptions`, `CreateManyOptions`,
`UpdateOptions`, `DeleteOptions`, `UpsertOptions`, `UpsertManyOptions`, `FindOneOptions`,
`OnConflictClause`, `OnConflictAction`, `RelationIncludeMap`, `RelationIncludeOptions`,
`PgSelectResult`, `PgInsertResult`, `PgUpdateResult`, `PgDeleteResult`, `PgQueryResult`, and the
re-exported `WhereClause`, `WhereOperators`, `BuiltQuery`, and `*Descriptor` types from
`@damatjs/orm-type`.

The package has a single export entry (`.`); there are no subpath exports.

> **Note:** the `PgEntityManager` constructor takes only `{ pool, logger? }` (`PgEntityManagerConfig`).
> Models are added via `registerModel(name, model)`, not a `models` field. The
> `tests/integration.test.ts` file shows an older `{ pool, models }` shape that the current
> `PgEntityManagerConfig` no longer accepts — trust the source.

## How it fits

Runtime dependencies (`package.json`):

- `@damatjs/orm-core` — `ModelRegistry`, `QueryLogger`, `getQueryLogger` (logging + model registry).
- `@damatjs/orm-model` — `ModelDefinition` and the relation builders (`BelongsTo`/`HasMany`/`HasOne`).
- `@damatjs/orm-type` — `Pool`/`PoolClient`/`QueryResultRow`, where/order types, and all `*Descriptor` types.
- `@damatjs/logger` — `ILogger`.
- `@damatjs/types` — shared base types.

It consumes a `Pool` produced by `@damatjs/orm-connector` (a sibling, not a hard dependency).

In-repo dependents:

- `@damatjs/orm-main` (re-exports the whole package).
- `@damatjs/service` (`PoolManager` constructs a `PgEntityManager`).
- `backend/default` (application code).

## Documentation

- [Internals & maintainer docs](./docs/README.md)
- [Damat full guide](../../../docs/GUIDE.md)

## License

MIT
