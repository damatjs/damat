# @damatjs/orm-model — Internals

Maintainer documentation for the schema-definition DSL. This package is the
largest in the ORM stack and the one most likely to change as new column types,
relation features, and validation rules are added. Read this index first, then
the focused docs below.

The package is **pure metadata**: builders accumulate state and emit serializable
schema objects (`@damatjs/orm-type` shapes). No SQL is executed here.

## Split docs

| Doc                                                        | Covers                                                                                                                  |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [column-builders.md](./column-builders.md)                 | `ColumnBuilder` base + every concrete column type, the `columns` factory, `EnumBuilder`.                                |
| [relations.md](./relations.md)                             | `Relation` base, `BelongsTo` / `HasMany` / `HasOne`, target resolution, and the relation validators.                    |
| [indexes-and-constraints.md](./indexes-and-constraints.md) | `IndexBuilder`, `ConstraintBuilder`, `cleanupIndexSchema`, auto-naming.                                                 |
| [schema-and-model.md](./schema-and-model.md)               | `ModelDefinition`, `model()`, `toTableSchema()`, `toModuleSchema()`, the global model registry, timestamps/soft-delete. |
| [type-inference.md](./type-inference.md)                   | `pgTypeToTsBase`, `toTsType()`, enum type emission, the string-case helpers, and the (stale) codegen scripts.           |

## Module map

| Path                                          | Responsibility                                                                                        |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/index.ts`                                | Root barrel: re-exports `properties`, `schema`, `types`, `utils`.                                     |
| `src/schema/model.ts`                         | `ModelDefinition` class + `model()` factory. The orchestrator.                                        |
| `src/schema/toModuleSchema.ts`                | `toModuleSchema()` — groups models, hoists relations.                                                 |
| `src/schema/index.ts`                         | Re-exports model, `toModuleSchema`, and the relation validators.                                      |
| `src/types/schema.ts`                         | `PropertyValue` / `ModelProperties` unions.                                                           |
| `src/types/index.ts`                          | Re-exports `@damatjs/orm-type` + local `schema.ts`.                                                   |
| `src/properties/index.ts`                     | Barrel for all property builders.                                                                     |
| `src/properties/columns.ts`                   | The `columns` factory object (the public DSL surface).                                                |
| `src/properties/column/base.ts`               | `ColumnBuilder` — base fluent column + `toSchema()` / `toTsType()`.                                   |
| `src/properties/column/*.ts`                  | Concrete column builders (boolean, number, text, time, json, uuid, bytea, enum, id, vector).          |
| `src/properties/enum/base.ts`                 | `EnumBuilder`.                                                                                        |
| `src/properties/indexes/base.ts`              | `IndexBuilder` (+ `indexBuilder()` factory in `index.ts`).                                            |
| `src/properties/constraints/base.ts`          | `ConstraintBuilder` (+ `constrainBuilder()` factory in `index.ts`).                                   |
| `src/properties/foreignKeys/base.ts`          | **Entirely commented out** — a legacy `ForeignKeyBuilder` superseded by `BelongsTo`. No live exports. |
| `src/properties/relation/base.ts`             | `Relation` abstract base.                                                                             |
| `src/properties/relation/belongsToBuilder.ts` | `BelongsTo` (owning side, FK column generation).                                                      |
| `src/properties/relation/hasManyBuilder.ts`   | `HasMany` (inverse 1:N).                                                                              |
| `src/properties/relation/hasOneBuilder.ts`    | `HasOne` (inverse 1:1).                                                                               |
| `src/properties/relation/validate/*.ts`       | Relation cross-validation (live + schema passes, formatting, error).                                  |
| `src/utils/pgTypeToTsBase.ts`                 | `ColumnType` → TS type-string map + `enumTypeToTsBase`.                                               |
| `src/utils/cleanupIndex.ts`                   | Index normalisation / auto-naming.                                                                    |
| `src/utils/stringConvertor.ts`                | `toPascalCase` / `toCamelCase` / `toEnumTypeName`.                                                    |
| `src/utils/target.ts`                         | `ModelTarget` type + `resolveModuleTarget` + `removeLastS`.                                           |
| `src/utils/registry.ts`                       | Global table-name → `ModelDefinition` registry.                                                       |
| `src/errors/*.ts`                             | `OrmError` hierarchy + `transformPgError`. **Not exported from `src/index.ts`** (see note below).     |
| `src/tests/`                                  | Bun tests + e-commerce fixtures + committed snapshot/generated types.                                 |
| `scripts/`                                    | `generate-snapshots.ts` (works) and `generate-types.ts` (imports a missing `src/codegen` — stale).    |

## Architecture overview

```
                 columns.* factory  (properties/columns.ts)
                          │ produces
   ┌──────────────────────┼───────────────────────────────────┐
   ▼                      ▼                                     ▼
 ColumnBuilder      BelongsTo / HasMany / HasOne          IndexBuilder /
 (+ subclasses)     (relation/*)                          ConstraintBuilder
   │                      │                                     │
   └──────────────┬───────┴─────────────────────────┬──────────┘
                  ▼   stored as model properties     ▼
            ModelDefinition  (schema/model.ts)
                  │  .toTableSchema()                .toTsType()
                  ▼                                   ▼
            TableSchema  ──► toModuleSchema() ──► ModuleSchema   TS interface string
                                  │  hoists relations
                                  ▼
                         relationships: RelationSchema[]
                                  │
                                  ▼
              validateRelations / validateRelationSchemas
```

## Main control flow: `toTableSchema()`

`ModelDefinition.toTableSchema()` (in `schema/model.ts`) is the heart of the
package. It iterates the model's properties once and dispatches by builder type:

1. `ColumnBuilder` → set its name to the property key, push `.toSchema()`.
2. `BelongsToBuilder` → push the FK column schema(s), push a `ForeignKeySchema`,
   push a `RelationSchema`, and (if `.indexed()`) append an index per FK column.
3. `HasManyBuilder` / `HasOneBuilder` → push a `RelationSchema` only (no column).
4. Append `created_at` / `updated_at` if `_timestamps` (default on) and not
   already present.
5. Append the soft-delete column (`deleted_at`) if `_softDelete` (default on).
6. Assemble `{ name, columns, indexes, foreignKeys, constraints, relations }`
   (+ `schema` when set).

`toModuleSchema()` then maps each model's `toTableSchema()`, strips the per-table
`relations`, and collects them into the module-level `relationships`.

## Key invariants & design decisions

- **Property name is the column name (usually).** Columns get their name from the
  property key via `_setName(propName)` at schema time — builders start nameless.
- **Timestamps and soft-delete are ON by default.** `_timestamps` and
  `_softDelete` default to `true`; `created_at`/`updated_at`/`deleted_at` are
  auto-appended (typed `date`). Disable with `.timestamps(false)` /
  `.softDelete(false)`. Auto-columns are skipped if a column of the same name
  already exists (also tolerates `createdAt`/`updatedAt` camelCase variants).
- **A `ModelDefinition` self-registers on construction.** The constructor calls
  `registerModel(this._tableName, this)`, populating the global registry that
  backs string relation targets (`hasMany("orders")`). This is a process-global
  `Map` — beware cross-test leakage and duplicate table names.
- **`belongsTo` owns the FK; `hasMany`/`hasOne` are metadata only.** Only
  `BelongsTo` creates columns and a `ForeignKeySchema`. The inverse sides exist to
  describe the graph and to be validated.
- **Three ways to target a relation:** direct model, lazy thunk
  (`() => Model`, for circular init), or string table name (resolved via the
  global registry — requires the target to be defined first).
- **`.indexes()` / `.constrain()` replace, not append.** Each call overwrites the
  prior array. FK indexes from `.indexed()` are appended at `toTableSchema()` time
  on a copy, so they don't mutate `_indexes`.
- **Enum columns store only the name.** `EnumColumnBuilder` extracts the enum's
  name at construction; it holds no live `EnumBuilder` reference afterwards.
- **`pgTypeToTsBase` is an exhaustive `switch` over `ColumnType`.** Adding a
  column type in `@damatjs/orm-type` requires a new case here or the build breaks.
- **The errors module is dead-ish code in this package.** `src/errors/` defines an
  `OrmError` hierarchy and `transformPgError`, but `src/index.ts` does **not**
  re-export it, so these are not part of the public surface from this package.
  Don't assume callers can import them from `@damatjs/orm-model`.

## Testing

`bun test` runs `bun run snapshot` first, then the suites in `src/tests/`:

- `columns.test.ts`, `constraints.test.ts`, `indexes.test.ts`,
  `foreignkeys.test.ts`, `relations.test.ts`, `model.test.ts`,
  `validation.test.ts`, `validationSchema.test.ts`, `snapshots.test.ts`.
- Fixtures live in `src/tests/__fixtures__/` — a small e-commerce domain
  (user, category, product, order, order_item) used across suites and by the
  snapshot/codegen scripts.
- `src/tests/__snapshots__/module.snap.json` is the committed `toModuleSchema()`
  output; `snapshots.test.ts` guards against unintended changes. Regenerate with
  `bun run snapshot` after an intentional schema-shape change.

> The committed `module.snap.json` predates the addition of `fromTable` to
> `RelationSchema`, so its `relationships` entries omit `fromTable` while the
> current `toRelationSchema()` emits it. Regenerating the snapshot brings them in
> line.

## Related

- [Package overview](../README.md)
- [`@damatjs/orm-type` internals](../../type/docs/README.md)
- [`@damatjs/orm-core` internals](../../core/docs/README.md)
- [Full guide](../../../../docs/GUIDE.md)
