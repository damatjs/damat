# @damatjs/orm-type — Internals

Maintainer-facing notes for the shared type package. This is a **types-only**
package: every file under `src/` compiles to a `.d.ts` and an empty/near-empty
`.js`. There is no runtime behavior to reason about — the work here is keeping
the type vocabulary correct and consistent so the rest of the ORM stack stays
type-safe.

## Module map

| Path                       | Responsibility                                                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`             | Barrel. Re-exports `pg` driver types and the four type groups.                                                                               |
| `src/connection/`          | Connection, pool, transaction, and query-context types. See [connection-and-query.md](./connection-and-query.md).                            |
| `src/connection/main.ts`   | `DbConnection` — the connection abstraction interface.                                                                                       |
| `src/connection/config.ts` | `DbPoolConfig`, `PoolStats`, `TransactionOptions`, `QueryContext`, etc.                                                                      |
| `src/model/`               | Schema snapshot types (columns, tables, enums, FKs, constraints, indexes, relations, modules). See [schema-types.md](./schema-types.md).     |
| `src/model/column.ts`      | `ColumnType` union + `ColumnSchema`.                                                                                                         |
| `src/model/table.ts`       | `TableSchema`.                                                                                                                               |
| `src/model/module.ts`      | `ModuleSchema` (the schema snapshot — not the migration manifest).                                                                           |
| `src/model/enum.ts`        | `EnumSchema`.                                                                                                                                |
| `src/model/foreignKey.ts`  | `ForeignKeyAction`, `ForeignKeyType`, `ForeignKeySchema`, `ForeignKeySchemaMatch`.                                                           |
| `src/model/constrain.ts`   | `ConstraintType` + the four constraint shapes + `ConstraintSchema`.                                                                          |
| `src/model/indexType.ts`   | `IndexType`, `IndexColumn`, `IndexSchema`.                                                                                                   |
| `src/model/relation.ts`    | `RelationType`, `RelationSchema`, and builder option payloads (`RelationOptions`, `LinkConfig`, `ConstraintOptions`).                        |
| `src/query/`               | Query JSON descriptors and clause types. See [connection-and-query.md](./connection-and-query.md).                                           |
| `src/query/clauses.ts`     | `WhereOperators`, `WhereClause`, `OrderByClause`, `BuiltQuery`, `RawWhereClause`.                                                            |
| `src/query/descriptors.ts` | `SelectDescriptor`, `InsertDescriptor`, `UpdateDescriptor`, `DeleteDescriptor`, `UpsertDescriptor`, `RelationDescriptor`, `QueryDescriptor`. |
| `src/migration/index.ts`   | `OrmModule`, `OrmModuleContainer` — the module manifest types used by the migration/CLI layer.                                               |

## Architecture overview

```
@damatjs/deps/pg ──► (Pool, PoolClient, QueryResultRow)
                          │
        ┌─────────────────┴───────────────────┐
        │           @damatjs/orm-type          │
        │                                       │
        │  connection/   model/   query/   migration/
        └───────────────────────────────────────┘
                          ▲
       depended on by everything else in the ORM stack
   (orm-model, orm-core, orm-pg, orm-migration, codegen, …)
```

There is exactly one published entry point (`exports["."]`). Consumers import
from the package root; the folder split is purely for source organisation.

## Two complementary representations

The type system describes a schema at two levels, and it is important to keep
them straight when editing:

1. **Builder option payloads** — `RelationOptions`, `LinkConfig`,
   `ConstraintOptions` (in `model/relation.ts`). These describe what a caller
   passes _into_ the `@damatjs/orm-model` fluent builders.
2. **Serialized snapshot** — `ColumnSchema`, `TableSchema`, `ModuleSchema`,
   `ForeignKeySchema`, `ConstraintSchema`, `IndexSchema`, `RelationSchema`,
   `EnumSchema`. These describe the JSON-able output of those builders
   (`model().toTableSchema()` / `toModuleSchema()`).

The snapshot types are the contract the migration engine, codegen, and registry
read. The query descriptor types (`SelectDescriptor` & friends) are a third,
independent representation used by the query builder and executor.

## Key invariants & design decisions

- **No runtime code.** Keep it that way. If a helper needs runtime logic it
  belongs in `@damatjs/orm-model` or `@damatjs/orm-core`, not here. A stray
  `const`/`function` would bloat every downstream bundle.
- **`ColumnType` mirrors PostgreSQL exactly.** The union uses the SQL type
  _names_ as they appear in the PostgreSQL docs (`"character varying"`,
  `"timestamp without time zone"`, `"double precision"`, …), not friendly
  aliases. The model DSL and the `pgTypeToTsBase` mapper in `@damatjs/orm-model`
  switch on these exact strings, so adding a type here means adding a case there
  too (the mapper's `switch` is exhaustive over `ColumnType`).
- **`ColumnSchema.nullable` is required; most other flags are optional.** Builders
  always set `nullable`; downstream code can rely on it being present.
- **`ForeignKeySchema.columns` is `ForeignKeyType[]` (`{name,type}`), not
  `string[]`.** This carries the FK column's SQL type so the migration layer can
  emit the column DDL. Composite FKs are first-class — every FK field is an array.
- **`ModuleSchema.tables` is `Omit<TableSchema, "relations">[]`.** Relations are
  _hoisted_ out of each table into the module-level `relationships` array by
  `toModuleSchema()`. Don't add a per-table `relations` field back into the
  module representation — it would duplicate the hoisted data.
- **Two unrelated `OrmModule`/`ModuleSchema` names exist.** `model/module.ts`
  exports `ModuleSchema` (schema snapshot). `migration/index.ts` exports
  `OrmModule` (artifact identity plus optional resolved entry/model/migration
  paths, mutability, package name, and link-module `kind`). They are different
  concepts; do not conflate them.
- **Query descriptors are JSON-serializable.** `WhereConditionJson` /
  `OrderByJson` are the plain-object forms used in descriptors;
  `WhereClause`/`OrderByClause` are the builder-facing forms. Keep both in sync
  when adding operators.

## Safely extending

- **Adding a column type:** add the literal to `ColumnType` in
  `model/column.ts`, then add a matching `case` to `pgTypeToTsBase` in
  `@damatjs/orm-model` (`src/utils/pgTypeToTsBase.ts`) — the switch is
  exhaustive, so TypeScript will flag the missing case at build time.
- **Adding a where operator:** add it to `WhereOperators` in `query/clauses.ts`;
  the query builder package will then need a branch to compile it to SQL.
- **Adding a constraint kind:** extend `ConstraintType` and add a new interface
  to the `ConstraintSchema` union in `model/constrain.ts`, then handle it in the
  `ConstraintBuilder` (model) and DDL generator (migration).
- Because there are no tests in this package (`test` is `exit 0`), correctness is
  enforced entirely by downstream type-checking. Build the dependents
  (`orm-model`, `orm-pg`, `orm-migration`) after any change here.

## Related

- [Package overview](../README.md)
- [`@damatjs/orm-model` internals](../../model/docs/README.md)
- [Full guide](../../../../docs/GUIDE.md)
