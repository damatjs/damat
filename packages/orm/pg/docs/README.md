# @damatjs/orm-pg — Internals

Maintainer-facing documentation for the PostgreSQL execution layer. For the consumer-facing overview
see the [package README](../README.md). This index maps the source tree, explains the layered
architecture and data flow, records the load-bearing invariants, and links to one document per concern.

## Layered architecture

The package is a stack of four layers. Higher layers are convenience over the lower ones; you can
drop in at any level.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ manager/   PgEntityManager · TransactionalEntityManager                    │  caches repos, runs txns, raw SQL
├──────────────────────────────────────────────────────────────────────────┤
│ repository/  PgRepository (+ createRepository factory)                     │  ergonomic CRUD returning rows/count
├──────────────────────────────────────────────────────────────────────────┤
│ client/    PgModelClient (+ ops/find, ops/mutate, ops/transaction)         │  per-model CRUD → { rows, rowCount, descriptor }
├──────────────────────────────────────────────────────────────────────────┤
│ query/     ModelAccessor → SelectBuilder/Insert/Update/Delete/Upsert       │  pure: model+options → { sql, json }
│            + helpers (where, ident, clauses, asserts) + relations (lateral) │
├──────────────────────────────────────────────────────────────────────────┤
│ executor/  pgExecuteRaw · pgTransaction                                     │  runs BuiltQuery on Pool/PoolClient, logs
├──────────────────────────────────────────────────────────────────────────┤
│ transaction/  TransactionManager · TransactionContext                      │  BEGIN/COMMIT/ROLLBACK + savepoints
└──────────────────────────────────────────────────────────────────────────┘
```

A single CRUD call flows top-to-bottom and back:

```
em.repo("user").findMany(opts)
  → PgRepository.findMany               (repository/repository.ts)
  → PgModelClient.findMany              (client/base.ts)
  → executeFindMany                     (client/ops/find/many.ts)
  → accessor.findMany(opts)             (query/accessor/base.ts)  ─┐ pure
      → SelectBuilder.generate{Sql,Json}(query/select/builder.ts) ─┘  → { sql: BuiltQuery, json: SelectDescriptor }
  → pgExecuteRaw(conn, sql)             (executor/raw.ts)  → pg driver
  → { rows, rowCount, descriptor }
```

## Module map

| Path                                                    | Responsibility                                                              | Doc                                                                    |
| ------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `src/index.ts`                                          | Public barrel; also `export const EntityManager = PgEntityManager`.         | —                                                                      |
| `src/manager/entityManager.ts`                          | `PgEntityManager` — repo cache, model registry, transactions, raw SQL.      | [entity-manager.md](./entity-manager.md)                               |
| `src/manager/transactionalEntityManager.ts`             | `TransactionalEntityManager` — dynamic `tx.<model>` accessors + savepoints. | [entity-manager.md](./entity-manager.md)                               |
| `src/manager/error.ts`                                  | `EntityManagerError`, `QueryExecutionError`.                                | [entity-manager.md](./entity-manager.md)                               |
| `src/repository/repository.ts`                          | `PgRepository` — ergonomic CRUD returning plain rows / counts.              | [repository.md](./repository.md)                                       |
| `src/repository/factory.ts`                             | `createRepository` — builds a repo from a model + connection.               | [repository.md](./repository.md)                                       |
| `src/client/base.ts`                                    | `PgModelClient` — per-model CRUD; returns `{ rows, rowCount, descriptor }`. | [client.md](./client.md)                                               |
| `src/client/ops/**`                                     | Thin `execute*` wrappers: accessor → SQL → `pgExecuteRaw`.                  | [client.md](./client.md)                                               |
| `src/client/types.ts`                                   | `PgModelClientLike`, `FindOneOptions`, option re-exports.                   | [client.md](./client.md)                                               |
| `src/query/accessor/**`                                 | `ModelAccessor` + option types; pure `model+options → { sql, json }`.       | [query-builder.md](./query-builder.md)                                 |
| `src/query/base.ts`                                     | `QueryBase` — shared where/orderBy/returning + column asserts.              | [query-builder.md](./query-builder.md)                                 |
| `src/query/select/**`                                   | `SelectBuilder`, JSON descriptor, lateral-join relation loading.            | [query-builder.md](./query-builder.md), [relations.md](./relations.md) |
| `src/query/insert/**`                                   | `InsertBuilder` + `ON CONFLICT` (`OnConflictClause`).                       | [query-builder.md](./query-builder.md)                                 |
| `src/query/update.ts`, `delete.ts`, `upsert.ts`         | `UpdateBuilder`, `DeleteBuilder`, `UpsertBuilder`.                          | [query-builder.md](./query-builder.md)                                 |
| `src/query/helpers/where/**`                            | `buildWhereClause`, `compileCondition` (operator → SQL).                    | [where.md](./where.md)                                                 |
| `src/query/helpers/{ident,clauses,asserts,assemble}.ts` | Identifier quoting, ORDER BY/RETURNING, column guards, part assembly.       | [query-builder.md](./query-builder.md), [where.md](./where.md)         |
| `src/query/relations/**`                                | Relation resolution + the `with` guard (`assertValidRelationMap`).          | [relations.md](./relations.md)                                         |
| `src/query/types/**`                                    | Where/order types, `ValuesMap`, descriptor re-exports.                      | [query-builder.md](./query-builder.md)                                 |
| `src/executor/raw.ts`, `transaction.ts`                 | `pgExecuteRaw`, `pgTransaction` — driver execution + logging.               | [executor.md](./executor.md)                                           |
| `src/transaction/manager.ts`, `context.ts`              | `TransactionManager`, `TransactionContext`.                                 | [transactions.md](./transactions.md)                                   |
| `src/types/**`                                          | `PgEntityManagerConfig`, `Pg*Result` shapes.                                | —                                                                      |
| `tests/integration.test.ts`                             | End-to-end CRUD/transaction/relation tests (needs Postgres).                | —                                                                      |

## Two outputs per query: SQL and JSON

Every accessor/builder produces **both** a parameterised `BuiltQuery` (`{ sql, params }`) and a JSON
`QueryDescriptor`. The `descriptor` is propagated up through `PgModelClient` results
(`PgSelectResult.descriptor`, etc.) so callers can inspect, cache-key, or transform a query without
re-parsing SQL. Builders never execute; execution is the executor's job. See
[query-builder.md](./query-builder.md).

## Key invariants & design decisions

- **Identifiers are always quoted, values are always parameterised.** Column/table names go through
  `quoteIdent` (which doubles embedded `"`); user values become `$N` placeholders. The one place a
  _value_ is interpolated into SQL is the transaction isolation level, which is guarded by an
  allow-list (`transaction/manager.ts`). Savepoint names are sanitised to `[a-zA-Z0-9_]`.
- **Unknown columns fail fast.** `QueryBase` builds a `Set` of known column names from the model and
  every builder asserts against it (`assertKnownColumns` / `assertKnownColumnList`) before emitting SQL —
  throwing `"[query:<ctx>] Unknown column …"`. Unknown relations throw `RelationGuardError`.
- **Mass mutation is opt-in.** `UpdateBuilder`/`DeleteBuilder` throw if no WHERE clause is present
  unless `.allowFullTable()` (surfaced as `allowFullTable: true` in repository options) is set.
- **Builders are single-use & stateless w.r.t. connection.** `ModelAccessor.builders.*` are getters
  that return a fresh builder each access. Builders hold no connection — they only generate.
- **Repos are cached per model.** `PgEntityManager` memoises one `PgRepository` per registered model.
  Transactional repos are created per-transaction bound to the transaction's `PoolClient`.
- **The transaction client is the unit of isolation.** A transaction acquires one `PoolClient`;
  all repos created inside the transaction share it, so every statement runs in the same transaction.

## Concern documents

- [entity-manager.md](./entity-manager.md) — `PgEntityManager`, `TransactionalEntityManager`, dynamic accessors.
- [repository.md](./repository.md) — `PgRepository` methods, `createRepository`, `count`/`exists` subqueries.
- [client.md](./client.md) — `PgModelClient`, the `ops/*` execute wrappers, result shapes.
- [query-builder.md](./query-builder.md) — `ModelAccessor` and all five builders (select/insert/update/delete/upsert).
- [where.md](./where.md) — the WHERE compiler, operators, raw clauses, parameter renumbering.
- [relations.md](./relations.md) — `with` loading, relation resolution, lateral-join SQL.
- [transactions.md](./transactions.md) — `TransactionManager`/`TransactionContext`, isolation, savepoints.
- [executor.md](./executor.md) — `pgExecuteRaw`/`pgTransaction` and query logging.
