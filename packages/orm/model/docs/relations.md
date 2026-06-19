# Relations

Covers the three relation builders, the abstract `Relation` base, target
resolution, and the relation validators. Source under
`src/properties/relation/` and `src/utils/target.ts`.

## Mental model

A relation has two sides:

- **Owning side — `BelongsTo`.** Lives on the table that holds the foreign key.
  It is the only relation that produces DB artifacts: the FK column(s) and a
  `ForeignKeySchema`.
- **Inverse side — `HasMany` (1:N) / `HasOne` (1:1).** Lives on the referenced
  table. Produces **no** column and no FK — it is pure ORM metadata describing the
  graph.

Both sides emit a `RelationSchema` into the table's `relations`, which
`toModuleSchema()` hoists into the module's `relationships`.

```
order.user  = belongsTo("user")   →  creates user_id FK column + FK constraint on `order`
user.orders = hasMany("order").mappedBy("user")  →  no column; metadata only
```

## `Relation` base (`relation/base.ts`)

```ts
abstract class Relation {
  readonly kind: RelationType;            // "belongsTo" | "hasMany" | "hasOne"
  protected target: ModelTarget;

  getModuleTarget(): ModelDefinition;     // resolves the target (registry/thunk/model)
  getModuleTargetTable(): string;         // target table name — string target used as-is, no resolution

  abstract createsForeignKey(): boolean;  // true only for BelongsTo
  abstract toRelationSchema(fromTable: string, fromProp: string): RelationSchema;
}
```

There is deliberately no generic type parameter — relations are structural
builders; row-type propagation is not their job.

## Targets (`src/utils/target.ts`)

```ts
type LazyModel = () => any;
type ModelTarget = ModelDefinition | LazyModel | string;

resolveModuleTarget(target: ModelTarget): ModelDefinition
removeLastS(tableName: string): string   // "users" -> "user"
```

A relation target is a **table-name string**. Foreign keys are inferred by
convention (`<targetTable>_id` → `id`), no import of the target model is needed,
and circular references between tables are a non-issue. A direct model reference
or a lazy thunk also work and resolve to the same schema:

```ts
belongsTo("users")           // table name — the normal form; no import needed
belongsTo(UserSchema)        // direct model — requires UserSchema already defined
belongsTo(() => UserSchema)  // lazy thunk — defers resolution past circular init
hasMany("orders")            // table name on the inverse side
```

`resolveModuleTarget`:

- string → `getRegisteredModel(name)`; throws a descriptive error if the table is
  not in the global registry (models must be loaded before resolution).
- function → calls it and uses the result.
- model → returned as-is.

`removeLastS` provides the default `mappedBy`: it strips a trailing `s`
(`"users"` → `"user"`). `LazyModel` returns `any` on purpose, to stop TypeScript
from chasing circular return types during type-checking.

## `BelongsTo` (`relation/belongsToBuilder.ts`)

The owning side. Exported as both `BelongsTo` and `BelongsToBuilder` (the alias is
what `schema/model.ts` uses in its `instanceof` checks).

### Fluent API

```ts
belongsTo(target, options?)            // options.mappedBy = inverse prop name on target
  .link({ name?, foreignKey?, reference? })
  .nullable()        // FK column nullable; also defaults ON DELETE → SET NULL
  .unique()          // FK column UNIQUE → makes it a 1:1
  .indexed()         // add a btree index per FK column
  .onDelete(action)  .onUpdate(action)  .match(type)
  .deferrable(initially=false)
  .constraint({ name?, onDelete?, onUpdate?, deferrable?, initiallyDeferred?, match? })
```

### `.link()` details

`link(config)` configures FK and referenced columns:

- Defaults: `foreignKey` → `["<targetTable>_id"]`, `reference` → `["id"]`.
- Normalises single values to arrays; **throws** if `foreignKey.length !==
  reference.length` (composite FKs must line up).
- String FKs become `{ name, type: "text" }`; pass `ForeignKeyType` objects to
  control the SQL type. `config.name` sets the constraint name.

### Resolved defaults (getters)

- `getForeignKey()` → falls back to `[{ name: "<targetTable>_id", type: "text" }]`
  when unset. **Note:** the fallback uses the *target table* name, not the
  property name (despite a doc-comment mentioning property-name fallback — the
  property-name path is not wired). So `order.user = belongsTo(User)` yields a
  `user_id` column.
- `getReference()` → `["id"]` by default.
- `getConstrainName()` → `<targetTable>_<fkNames...>_fk` when unset. This is why
  the fixture FK is named `category_category_id_fk` (target=`category`,
  fk=`category_id`).
- `getMappedBy()` → explicit `mappedBy`, else `removeLastS(targetTable)`.
- `hasExplicitMappedBy()` → whether `mappedBy` was passed (drives validation).

### Schema generation

```ts
createsForeignKey(): boolean        // always true
toColumnBuilder(): ColumnBuilder[]  // one builder per FK column
toColumnSchema(): ColumnSchema[]    // .toColumnBuilder().map(b => b.toSchema())
toForeignKeySchema(): ForeignKeySchema
toRelationSchema(fromTable, fromProp): RelationSchema
toTsType(): string                  // delegates to target.toTsType(); toPascalCase(target) for string targets
```

All table-name lookups (`getForeignKey()`, `getConstrainName()`, `getMappedBy()`,
`toForeignKeySchema()`, `toRelationSchema()`) go through `getModuleTargetTable()`,
so a `belongsTo("orders")` string target emits its FK column, constraint and
relation schema **without** resolving the target model — same as `hasMany` /
`hasOne`. This is what makes cross-module relations (referencing a table owned by
another module) work without importing that module's model.

- **`toColumnBuilder()`** picks the builder by `fk.type`: `uuid` →
  `UuidColumnBuilder`; `integer`/`smallint`/`bigint` → `IntegerColumnBuilder`;
  everything else → `TextColumnBuilder`. Applies `.nullable()` / `.unique()`,
  then `_setName(fk.name)`.
- **`toForeignKeySchema()`** sets `onDelete = "SET NULL"` automatically when the
  relation is `.nullable()` and no explicit `onDelete` was given. Other rules
  (`onUpdate`, `deferrable`, `initiallyDeferred`, `match`, `nullable`, `unique`,
  `indexed`) are copied only when set.
- **`toRelationSchema()`** emits `type: "belongsTo"`, `mappedBy: [getMappedBy()]`,
  `linkedBy: [fk names]`, and a `rule` object only if any referential option is
  set.

## `HasMany` / `HasOne` (`hasManyBuilder.ts`, `hasOneBuilder.ts`)

Near-identical inverse builders.

```ts
hasMany(target, options?).mappedBy(prop)   // 1:N
hasOne(target, options?).mappedBy(prop)    // 1:1
```

- `createsForeignKey()` → `false`. No columns, no FK constraint.
- `getMappedBy()` → returns the explicit value or `undefined` (no auto-derive on
  the inverse side, unlike `BelongsTo`).
- `toRelationSchema()` emits `type: "hasMany"`/`"hasOne"`, resolves the target
  table (string target used directly without registry lookup), and includes
  `mappedBy` only when set.
- `toTsType()` → `Array<Target>` for `hasMany`, `Target` for `hasOne` (uses
  `toPascalCase(target)` for string targets). Note: `toTableSchema()` /
  `toTsType()` on `ModelDefinition` **omit** inverse relations from row types —
  these `toTsType()` methods exist for other consumers.

Each file also exports a backwards-compat `*Builder` alias.

## How `ModelDefinition` wires it together

In `toTableSchema()` (see [schema-and-model.md](./schema-and-model.md)):

- `BelongsToBuilder` → push `toColumnSchema()` columns, push
  `toForeignKeySchema()`, push `toRelationSchema()`, and if `isIndexed()` append
  `{ columns: [fkName] }` per FK column.
- `HasManyBuilder` / `HasOneBuilder` → push `toRelationSchema()` only.

## Relation validation (`relation/validate/`)

Two entry families, each with a `validate*` (returns result) and `assertValid*`
(throws) variant.

### Live-builder validation

```ts
validateRelations(models: ModelDefinition[]): ValidationResult
assertValidRelations(models: ModelDefinition[]): void   // throws RelationValidationError
```

Builds a `tableName → model` map, then for each model runs two passes and
collects **all** violations:

- **Pass 1 — `checkBelongsTo`** (`checkBelongsTo.ts`): only for `belongsTo` with
  an **explicit** `mappedBy`. Verifies the named property exists on the target,
  is a `HasMany`/`HasOne` (`wrong_type` otherwise), and — if the inverse has its
  own explicit `mappedBy` — that it points back (`mappedBy_mismatch`). When
  `mappedBy` is auto-derived, the inverse is optional and is left to Pass 2.
- **Pass 2 — `checkInverse`** (`checkInverse.ts`): for every `hasMany`/`hasOne`
  with a `mappedBy`, the named property on the target must exist and be a
  `belongsTo` (`missing_belongsTo` / `wrong_type`); fires `mappedBy_mismatch` only
  when the `belongsTo` has its own explicit, disagreeing `mappedBy`.

Targets not present in the supplied model list are skipped silently (so you can
validate a subset).

### Schema-level validation

```ts
validateRelationSchemas(relationships: RelationSchema[]): ValidationResult
assertValidRelationSchemas(relationships: RelationSchema[]): void
```

Operates on the serialized `RelationSchema[]` (e.g. `moduleSchema.relationships`
loaded from JSON), with no access to live builders.

- **`checkBelongsToSchema`**: each `belongsTo` with a `mappedBy` must have a
  matching `hasMany`/`hasOne` entry where `fromTable === rel.to` and
  `to === rel.fromTable`, else `missing_inverse`.
- **`checkInverseSchema`**: each `hasMany`/`hasOne` with a `mappedBy` must have a
  matching `belongsTo` entry the same way, else `missing_belongsTo`.

### Violations & errors (`types.ts`, `format.ts`, `index.ts`)

```ts
type ViolationKind = "missing_inverse" | "missing_belongsTo" | "wrong_type" | "mappedBy_mismatch";

interface RelationViolation {
  kind: ViolationKind;
  sourceTable: string; sourceProp: string;
  sourceType: "belongsTo" | "hasMany" | "hasOne";
  targetTable: string; targetProp: string;
  expectedType?: "belongsTo" | "hasMany" | "hasOne";
  foundType?: string;
}

interface ValidationResult { valid: boolean; violations: RelationViolation[]; }

class RelationValidationError extends Error { readonly violations: RelationViolation[]; }
```

`formatViolations()` renders all violations into one human-readable message with
copy-pasteable fixes (e.g. "add `posts: hasMany(...).mappedBy("author")` to
user"). `RelationValidationError`'s message is `formatViolations(violations)`.

## Gotchas

- **Constraint-name prefix is the target table, not the source.** `belongsTo`'s
  auto FK name is `<target>_<fk>_fk`. If you need source-prefixed names, set
  `.link({ name })` or `.constraint({ name })`.
- **Auto `mappedBy` differs by side.** `belongsTo` auto-derives via
  `removeLastS(targetTable)`; `hasMany`/`hasOne` do **not** auto-derive (their
  `getMappedBy()` returns `undefined` when unset), so a one-sided inverse passes
  validation untouched.
- **String targets and ordering.** Schema generation (columns, FK, relation
  metadata, codegen) uses the string table name directly via
  `getModuleTargetTable()` — no registry lookup, so ordering does **not** matter
  there. Only *query-time* resolution (`getModuleTarget()` in `@damatjs/orm-pg`'s
  relation resolver) needs the live model, so the target must be loaded before you
  run a query that traverses the relation. Within a single file, lazy thunks
  (`() => User`) remain a good way to dodge circular-import issues.
- The legacy `src/properties/foreignKeys/base.ts` is entirely commented out;
  `BelongsTo` fully replaces that `ForeignKeyBuilder`. Don't revive it.

## Extending

- New relation option → add a fluent setter on `BelongsTo`, copy it into
  `toForeignKeySchema()` / the `rule` block of `toRelationSchema()`, and extend
  `ConstraintOptions` in `@damatjs/orm-type` if it should be settable via
  `.constraint()`.
- New validation rule → add a `ViolationKind`, a `format*` branch, and emit it
  from the relevant `check*` pass (and the schema-level twin if applicable).
