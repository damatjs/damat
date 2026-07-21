# @damatjs/orm-model

> The fluent, type-safe schema-definition DSL for the Damat ORM.

`@damatjs/orm-model` is the layer where you describe your database: tables,
columns, enums, indexes, constraints, and relationships, all through a small
fluent builder API (`model(...)` + `columns.*`). A model definition is pure
metadata — it produces a serializable `TableSchema` (and, grouped, a
`ModuleSchema`) that the rest of the stack turns into migrations, queries, and
generated TypeScript row types. It carries no SQL execution of its own. This is
the package you interact with most when modelling a domain; everything downstream
(registry, query builder, migration engine, and schema generators) consumes its
output.

Part of the [Damat](../../../README.md) monorepo · [Full guide](../../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

```bash
bun add @damatjs/orm-model
```

Inside the monorepo it is referenced as a workspace dependency:

```jsonc
// package.json
{
  "dependencies": {
    "@damatjs/orm-model": "*",
  },
}
```

## When to use

Use this package when you are:

- Defining tables / entities for a Damat module (`model(...)` + `columns.*`).
- Declaring named PostgreSQL enums (`EnumBuilder`).
- Adding indexes and table-level constraints (`indexBuilder` / `constrainBuilder`,
  or `columns.indexes()` / `columns.constrains()`).
- Wiring relationships (`columns.belongsTo` / `hasMany` / `hasOne`).
- Grouping models into a module snapshot (`toModuleSchema`) or validating that
  relations are wired consistently (`validateRelations` / `assertValidRelations`).

You would **not** use this package directly to:

- Run SQL or build queries — that is the driver layer (`@damatjs/orm-pg`).
- Register/look up models at runtime or log queries — that is
  [`@damatjs/orm-core`](../core/README.md).
- Generate migrations or DDL — that is the migration package.

## Quick start

```ts
import {
  model,
  columns,
  EnumBuilder,
  toModuleSchema,
  assertValidRelations,
} from "@damatjs/orm-model";

// A named enum (CREATE TYPE ... AS ENUM)
const OrderStatus = new EnumBuilder(["pending", "shipped", "delivered"]).name(
  "order_status",
);

const User = model(
  "user",
  {
    id: columns.id({ prefix: "usr" }).primaryKey(),
    email: columns.text().unique(),
    name: columns.text(),
    age: columns.integer().nullable(),
    verified: columns.boolean().default(false),
    metadata: columns.jsonb().nullable(),

    // inverse side — no FK column; FK lives on `order.user`
    orders: columns.hasMany("order").mappedBy("user"),
  },
  { schema: "store" },
).indexes([columns.indexes("uniq_users_email").columns(["email"]).unique()]);

const Order = model("order", {
  id: columns.id({ prefix: "ord" }).primaryKey(),
  total: columns.numeric(12, 2),
  status: columns.enum(OrderStatus),
  placedAt: columns.timestamp({ withTimezone: true }).defaultNow(),

  // owning side — creates the `user_id` FK column on `order`
  user: columns.belongsTo("user").onDelete("CASCADE").indexed(),
}).constrain([columns.constrains("orders_total_pos").check("total > 0")]);

// Catch broken relation wiring early
assertValidRelations([User, Order]);

// Produce the serializable snapshot
const schema = toModuleSchema("store", [User, Order], { enums: [OrderStatus] });
// schema.tables, schema.enums, schema.relationships
```

Each `model(...)` is also a `ModelDefinition` with `.toTableSchema()` (the
serialized table) and `.toTsType()` (a generated TS interface string).

## API

Single entry point (`.`). The package re-exports everything under `properties`,
`schema`, `types`, and `utils`.

### Definition entry points

| Export                                   | Kind     | Summary                                                                                                                                      |
| ---------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `model(tableName, properties, options?)` | function | Define a table. Returns a `ModelDefinition`.                                                                                                 |
| `ModelDefinition`                        | class    | A model: holds properties, fluent `.indexes()` / `.constrain()` / `.timestamps()` / `.softDelete()`, and `.toTableSchema()` / `.toTsType()`. |
| `columns`                                | object   | The builder factory — one method per column type plus `belongsTo`/`hasMany`/`hasOne`/`indexes`/`constrains`.                                 |
| `toModuleSchema(name, models, options?)` | function | Group models into a `ModuleSchema`, hoisting relations.                                                                                      |

### Column builders (`columns.*` and classes)

| Export                                                                                      | Kind  | Summary                                                                                                                                             |
| ------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ColumnBuilder`                                                                             | class | Base builder: `.primaryKey()`, `.nullable()`, `.unique()`, `.default()`, `.defaultRaw()`, `.array()`, `.fieldName()`, `.toSchema()`, `.toTsType()`. |
| `IdColumnBuilder`                                                                           | class | `columns.id({prefix})` — text PK with `generate_id('<prefix>')` default.                                                                            |
| `BooleanColumnBuilder`                                                                      | class | `columns.boolean()`.                                                                                                                                |
| `IntegerColumnBuilder`                                                                      | class | `columns.integer()` → `.bigInt()` / `.smallInt()` / `.serial()` / `.bigSerial()` / `.smallSerial()`.                                                |
| `NumericColumnBuilder`                                                                      | class | `columns.numeric(p?, s?)` (decimal) with `.precision()` / `.scale()`.                                                                               |
| `RealColumnBuilder`, `DoublePrecisionColumnBuilder`, `MoneyColumnBuilder`                   | class | `columns.real()`, `columns.doublePrecision()`, `columns.money()`.                                                                                   |
| `TextColumnBuilder`, `CharacterVaryingColumnBuilder`, `CharacterColumnBuilder`              | class | `columns.text()`, `columns.varchar(n?)`, `columns.char(n?)`.                                                                                        |
| `TimestampColumnBuilder`, `DateColumnBuilder`, `TimeColumnBuilder`, `IntervalColumnBuilder` | class | `columns.timestamp({withTimezone?})`, `columns.date()`, `columns.time()`, `columns.interval()`.                                                     |
| `JsonColumnBuilder`                                                                         | class | `columns.json({binary?})` / `columns.jsonb()`.                                                                                                      |
| `UuidColumnBuilder`                                                                         | class | `columns.uuid()` with `.defaultGenerate()`.                                                                                                         |
| `ByteaColumnBuilder`                                                                        | class | `columns.bytea()`.                                                                                                                                  |
| `EnumColumnBuilder`                                                                         | class | `columns.enum(EnumBuilder)`.                                                                                                                        |
| `VectorColumnBuilder`                                                                       | class | `columns.vector(dims)` — `real[]` with fixed dimensions for embeddings.                                                                             |

### Enums, indexes, constraints

| Export                                         | Kind           | Summary                                                                                                                              |
| ---------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `EnumBuilder`                                  | class          | Named PG enum. `.name()`, `.toSchema()`, `.toTsTypeName()`, `.toTsTypeDeclaration()`.                                                |
| `IndexBuilder` / `indexBuilder(name)`          | class/function | Index: `.columns()`, `.unique()`, `.type()`, `.where()`, `.concurrently()`.                                                          |
| `ConstraintBuilder` / `constrainBuilder(name)` | class/function | Table constraint: `.columns()`, `.unique()`, `.primaryKey()`, `.check()`, `.exclude()`, `.indexType()`, `.where()`, `.deferrable()`. |

### Relations

| Export                                                        | Kind           | Summary                                                                                                                                                                 |
| ------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BelongsTo` / `BelongsToBuilder` / `belongsTo(target, opts?)` | class/function | Owning side; creates the FK column(s). `.link()`, `.onDelete()`, `.onUpdate()`, `.nullable()`, `.unique()`, `.indexed()`, `.deferrable()`, `.match()`, `.constraint()`. |
| `HasMany` / `HasManyBuilder` / `hasMany(target, opts?)`       | class/function | Inverse 1:N; no DB artifact. `.mappedBy()`.                                                                                                                             |
| `HasOne` / `HasOneBuilder` / `hasOne(target, opts?)`          | class/function | Inverse 1:1; no DB artifact. `.mappedBy()`.                                                                                                                             |
| `Relation`                                                    | class          | Abstract base for the three relation builders.                                                                                                                          |
| `ModelTarget` / `LazyModel`                                   | type           | A relation target: `ModelDefinition` \| `() => ModelDefinition` \| `string` table name.                                                                                 |

### Relation validation

| Export                                                               | Kind     | Summary                                                               |
| -------------------------------------------------------------------- | -------- | --------------------------------------------------------------------- |
| `validateRelations(models)`                                          | function | Cross-check live `ModelDefinition`s; returns `{ valid, violations }`. |
| `assertValidRelations(models)`                                       | function | Throws `RelationValidationError` listing all violations.              |
| `validateRelationSchemas(rels)` / `assertValidRelationSchemas(rels)` | function | Same, but against a serialized `RelationSchema[]`.                    |
| `RelationValidationError`                                            | class    | Aggregated error carrying `violations` + a formatted message.         |
| `ValidationResult`, `RelationViolation`, `ViolationKind`             | type     | Validation result shapes.                                             |

### Utilities & re-exports

| Export                                                      | Kind     | Summary                                                                         |
| ----------------------------------------------------------- | -------- | ------------------------------------------------------------------------------- |
| `toPascalCase`, `toCamelCase`, `toEnumTypeName`             | function | String-case helpers used by codegen/type emission.                              |
| `pgTypeToTsBase`, `enumTypeToTsBase`                        | function | Map a `ColumnType` / enum values to a TypeScript type string.                   |
| `cleanupIndexSchema`                                        | function | Normalise a user index into an `IndexSchema` (auto-name, column normalisation). |
| `registerModel`, `getRegisteredModel`, `hasRegisteredModel` | function | The global table-name → model registry that backs string relation targets.      |
| `resolveModuleTarget`, `removeLastS`                        | function | Target resolution + table→singular helper.                                      |
| `PropertyValue`, `ModelProperties`                          | type     | The allowed property value union and the model property map.                    |

Everything from [`@damatjs/orm-type`](../type) (e.g. `ColumnType`, `TableSchema`,
`ModuleSchema`, `RelationSchema`) is re-exported from this package's root, so
model code rarely needs to import `@damatjs/orm-type` directly.

> **Note:** the package's `exports` map only has `.`. There is no `codegen`
> subpath export. Use `@damatjs/schema-codegen` for complete `ModuleSchema` to
> TypeScript/Zod source generation; row-type emission from this package itself
> is limited to `ModelDefinition.toTsType()`.

## How it fits

**Runtime dependencies** (`package.json`):

- [`@damatjs/orm-type`](../type) — shared schema/query types (re-exported here).
- [`@damatjs/deps`](../../deps) — bundled third-party deps.

**Notable in-repo dependents:**

- [`@damatjs/orm-core`](../core) — registers `ModelDefinition`s.
- `@damatjs/orm-pg` — builds queries from `ModelDefinition` and relation builders.
- `@damatjs/orm-processor`, `@damatjs/orm-migration`,
  `@damatjs/schema-codegen`, `@damatjs/module-generator`, `@damatjs/orm-cli`,
  `@damatjs/orm-main`.
- `@damatjs/module`, `@damatjs/service`.

## Documentation

- [Internals](./docs/README.md) — architecture, module map, and split deep-dives
  (column builders, relations, indexes/constraints, schema/model, type inference).
- [Full guide](../../../docs/GUIDE.md) — the Damat monorepo guide.

## License

MIT
