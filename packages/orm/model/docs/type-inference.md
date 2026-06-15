# Type inference & codegen helpers

Covers how PostgreSQL types map to TypeScript, how enum/row types are emitted, the
string-case helpers, and the state of the codegen scripts. Source:
`src/utils/pgTypeToTsBase.ts`, `src/utils/stringConvertor.ts`, the `toTsType()`
methods, and `scripts/`.

## `pgTypeToTsBase` (`src/utils/pgTypeToTsBase.ts`)

```ts
function pgTypeToTsBase(type: ColumnType): string
function enumTypeToTsBase(enumValues?: string[]): string
```

`pgTypeToTsBase` maps a `ColumnType` to the **base** TypeScript type string
(without nullability or array wrapping — those are applied by
`ColumnBuilder.toTsType()`). The crucial design rule: it maps to **what the
node-postgres (`pg`) driver actually returns at runtime**, not to an idealised
type. Highlights:

| PG type(s) | TS string |
| --- | --- |
| `smallint`, `integer`, `serial`, `smallserial`, `oid` | `number` |
| `bigint`, `bigserial` | `bigint` (pg returns native JS bigint for int8) |
| `real`, `double precision`, `numeric`, `decimal` | `number` |
| `money` | `string` (pg returns `"$1,234.56"`) |
| `text`, `character`, `character varying`, `uuid`, `xml`, `bit`, `bit varying`, network types, `time …`, `jsonpath`, `tsvector`, `tsquery`, `pg_lsn`, `pg_snapshot`, `line`/`path`/`polygon` | `string` |
| `bytea` | `Buffer` |
| `timestamp …`, `date` | `Date` |
| `boolean` | `boolean` |
| `enum` | `string` (fallback — resolved to the named alias before reaching here) |
| `json`, `jsonb` | `unknown` |
| `interval` | structured object literal `{ years; months; days; hours; minutes; seconds; milliseconds }` |
| `point` | `{ x: number; y: number }` |
| `lseg`, `box` | `{ x1; y1; x2; y2 }` |
| `circle` | `{ x; y; radius }` |
| range types (`int4range`, `int8range`, `numrange`, `tsrange`, `tstzrange`, `daterange`) | `{ lower; upper; isLowerBoundClosed; isUpperBoundClosed; isEmpty }` (bound type matches element type) |
| multirange types | `Array<{ …range… }>` |

> **Invariant:** the `switch` is exhaustive over `ColumnType` with no `default`.
> Adding a literal to `ColumnType` in `@damatjs/orm-type` without adding a case
> here is a compile error (the function would not return on that input). This is
> the intended safety net — keep it.

`enumTypeToTsBase(values)` builds a string-literal union (`'a' | 'b' | 'c'`), or
returns `"string"` when no values are given. It is used by
`EnumBuilder.toTsTypeDeclaration()` and can be used standalone.

## `toTsType()` composition

`ColumnBuilder.toTsType()` composes the base type with array/nullability:

- enum columns substitute the stored enum type *name* for the base (bypassing
  `pgTypeToTsBase`);
- `.array()` → `Array<base>`;
- nullable → `| null`, parenthesising union bases that are not arrays:
  `({ x: number; y: number }) | null`.

`ModelDefinition.toTsType(typeName?)` assembles the row interface from columns and
`belongsTo` FK columns, omitting inverse relations. See
[schema-and-model.md](./schema-and-model.md) and
[column-builders.md](./column-builders.md) for the rules.

## String-case helpers (`src/utils/stringConvertor.ts`)

```ts
toPascalCase(str)   // "order_item" -> "OrderItem"  (splits on _ - and space)
toCamelCase(str)    // "order_item" -> "orderItem"
toEnumTypeName(str) // "product_status" -> "ProductStatusEnum"
```

`toPascalCase` is used to name generated interfaces and to render string relation
targets in `toTsType()`. `toEnumTypeName` appends an `Enum` suffix — note this is
**not** the same name `EnumBuilder.toTsTypeName()` returns (which is the raw
`.name()` value). The two naming conventions diverge; see the codegen note below.

## EnumBuilder type emission

```ts
new EnumBuilder(["draft", "active"]).name("product_status")
  .toTsTypeName()         // "product_status"
  .toTsTypeDeclaration()  // "export type product_status = 'draft' | 'active';"
```

`EnumColumnBuilder` stores `toTsTypeName()` and uses it as the column's TS type,
so a column referencing this enum renders as `product_status` (or
`product_status | null`).

## Codegen scripts (`scripts/`) — current state

| Script | npm script | State |
| --- | --- | --- |
| `scripts/generate-snapshots.ts` | `bun run snapshot` | **Works.** Builds the e-commerce fixture module via `toModuleSchema()` and writes `src/tests/__snapshots__/module.snap.json`. Run after intentional schema-shape changes. |
| `scripts/generate-types.ts` | `bun run codegen` | **Stale / broken.** It imports `../src/codegen/index` and `generateFilesMap`, but there is **no `src/codegen/` directory** in this package. Running `codegen` will fail to resolve that import. |

The committed files under `src/tests/__snapshots__/generated/types/` (with
`export interface Order`, `export type NewOrder`, `export type UpdateOrder`, and
`…Enum`-suffixed enum aliases) were produced by that missing `generateFilesMap`
codegen — a richer emitter than `ModelDefinition.toTsType()`. Treat those files
as historical fixtures, not as output you can regenerate from this package today.

Practical guidance for maintainers:

- The reliable, in-package row-type emitter is `ModelDefinition.toTsType()`
  (base interface only; raw enum names; no `New`/`Update` variants).
- Full file-per-table codegen (insert/update types, `…Enum` naming via
  `toEnumTypeName`) lives in the separate `@damatjs/orm-codegen` package — that is
  where `generateFilesMap`-style logic belongs. If you intend to restore the
  `codegen` script here, point it at that package or recreate `src/codegen/`;
  don't assume it currently runs.

## Extending

- New column type → add its `pgTypeToTsBase` case (exhaustiveness will force it).
  Map to the real `pg` driver runtime shape, not the conceptual type.
- New naming convention → add to `stringConvertor.ts`; be deliberate about the
  `EnumBuilder.toTsTypeName()` (raw) vs `toEnumTypeName()` (suffixed) split so
  generated references stay consistent.
