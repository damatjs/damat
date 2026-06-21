# Type mapping

Sources: [`src/columnToTsType.ts`](../src/columnToTsType.ts), [`src/utils/pgTypeToTsBase.ts`](../src/utils/pgTypeToTsBase.ts), [`src/columnToZodSchema.ts`](../src/columnToZodSchema.ts)

## Responsibility

Convert a single `ColumnSchema` into either a TypeScript type string or a Zod schema string. These are the leaf primitives every generator builds on. They are deliberately split into a **base mapper** (one type, no nullability/array) and a **wrapper** (`columnToTsType`) that applies array and nullable decoration.

## TypeScript: `columnToTsType`

```ts
export const columnToTsType = (col: ColumnSchema): string
```

Algorithm:

1. **Resolve base type.** If `col.type === "enum"` and `col.enum` is set → `toEnumTypeName(col.enum)` (e.g. `"status_type"` → `"StatusTypeEnum"`). Otherwise → `pgTypeToTsBase(col.type)`.
2. **Array wrap.** If `col.array`, the base becomes `Array<base>`.
3. **Nullable wrap.** If `col.nullable`:
   - For a non-array whose base contains a top-level `" | "` (an inline object/union literal), wrap in parens: `(base) | null`. The `needsParens` scan ignores `|` inside `{}`/`<>` so only genuinely ambiguous unions get parenthesized.
   - Otherwise append `| null` to the (possibly array-wrapped) type.

Verified examples (from `tests/columnToTsType.test.ts`):

| `ColumnSchema` | result |
| --- | --- |
| `{ type: "uuid" }` | `string` |
| `{ type: "integer" }` | `number` |
| `{ type: "jsonb" }` | `unknown` |
| `{ type: "text", nullable: true }` | `string \| null` |
| `{ type: "text", array: true }` | `Array<string>` |
| `{ type: "integer", nullable: true, array: true }` | `Array<number> \| null` |
| `{ type: "enum", enum: "status_type" }` | `StatusTypeEnum` |
| `{ type: "enum", enum: "status_type", nullable: true, array: true }` | `Array<StatusTypeEnum> \| null` |

## Base mapping: `pgTypeToTsBase`

```ts
export function pgTypeToTsBase(type: ColumnType): string
export function enumTypeToTsBase(enumValues?: string[]): string
```

A `switch` over every `ColumnType` returning the **base** TS string the `pg` driver materializes at runtime. Highlights (not exhaustive — see the source for all cases):

| pg type(s) | TS base |
| --- | --- |
| `smallint`, `integer`, `smallserial`, `serial`, `oid` | `number` |
| `bigint`, `bigserial` | `bigint` |
| `real`, `double precision`, `numeric`, `decimal` | `number` |
| `money` | `string` (pg returns a locale string) |
| `text`, `character`, `character varying` | `string` |
| `bytea` | `Buffer` |
| `timestamp ...`, `date` | `Date` |
| `time ...` | `string` |
| `interval` | `{ years: number; months: number; days: number; hours: number; minutes: number; seconds: number; milliseconds: number }` |
| `boolean` | `boolean` |
| `enum` (unresolved fallback) | `string` |
| `json`, `jsonb` | `unknown` |
| `uuid`, `xml`, `bit`, `bit varying`, `cidr`, `inet`, `macaddr`, `macaddr8` | `string` |
| `point` | `{ x: number; y: number }` |
| `lseg`, `box` | `{ x1: number; y1: number; x2: number; y2: number }` |
| `circle` | `{ x: number; y: number; radius: number }` |
| `line`, `path`, `polygon` | `string` |
| `int4range`, `numrange` | `{ lower: number \| null; upper: number \| null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }` |
| `int8range` | same shape with `bigint` bounds |
| `tsrange`, `tstzrange`, `daterange` | same shape with `Date` bounds |
| `*multirange` | `Array<...>` of the corresponding range object |
| `pg_lsn`, `pg_snapshot` | `string` |

`enumTypeToTsBase(values)` builds a string-literal union (`'a' | 'b'`) from values, falling back to `string` when none are given. It is a standalone helper for when you have raw enum values rather than a named alias.

> The enum **case** in `pgTypeToTsBase` returns `string`; named enums never reach it because `columnToTsType` resolves them to the alias first. The fallback covers raw/unresolved enum columns.

## Zod: `columnToZodSchema`

```ts
export const columnToZodSchema = (col: ColumnSchema): string
```

Calls an internal `getZodBaseType(type, col)` switch, then wraps in `z.array(...)` if `col.array`. It does **not** add `.optional()` or `.nullable()` — the schema generators add those based on column nullability/defaults. Notable mappings:

| pg type(s) | Zod base |
| --- | --- |
| `smallint`, `integer`, `smallserial`, `serial` | `z.number().int()` |
| `bigint`, `bigserial` | `z.bigint()` |
| `real`, `double precision`, `numeric`, `decimal` | `z.number()` |
| `text`/`character`/`character varying` | `z.string()`, or `z.string().max(length)` when `col.length` is set |
| `money`, `time ...`, `jsonpath`, `xml`, `bit*`, network, `line`/`path`/`polygon`, text-search, `pg_lsn`/`pg_snapshot` | `z.string()` |
| `bytea`, `json`, `jsonb` | `z.unknown()` |
| `timestamp ...`, `date` | `z.coerce.date()` |
| `interval` | `z.object({ years, months, days, hours, minutes, seconds, milliseconds })` |
| `boolean` | `z.boolean()` |
| `uuid` | `z.string().uuid()` |
| `enum` | `z.string()` (the schema generators replace this with `z.enum([...])` when values are known) |
| `point`/`lseg`/`box`/`circle`, ranges, multiranges | structured `z.object(...)` / `z.array(z.object(...))` mirroring the TS shapes |
| `oid` | `z.number().int()` |

## Edge cases & gotchas

- **`needsParens` only matters for inline-object base types** (geometric/range/interval). For ordinary scalars the simple `| null` append is used. The scan deliberately skips the last 3 chars and treats `{}`/`<>` as nesting so e.g. `{ x: number; y: number }` is parenthesized but `string` is not.
- **TS and Zod disagree by design for some types.** TS uses what pg returns (`Buffer`, `Date`, object literals); Zod sometimes uses `z.unknown()` (bytea/json) or `z.coerce.date()` for ergonomic parsing. Don't assume one is derived from the other.
- **`length` only narrows `string` types in Zod** (`.max(length)`), and only character types in TS (via the SQL side, not here). Numeric `length`/`scale` don't affect the generated number type.
- **Unresolved enum columns** (`type: "enum"` without `col.enum`) yield `string`/`z.string()`, not an alias.

## Safe extension

- Adding a new `ColumnType`: add a `case` to `pgTypeToTsBase` **and** to `getZodBaseType` in `columnToZodSchema.ts` (both switches are over the same union; the Zod one has a `default: z.unknown()`, the TS one is exhaustive and will type-error on a missing case once the union grows).
- To change runtime expectations (e.g. parse `numeric` as `string` to avoid float loss), edit only the base mappers; `columnToTsType`'s array/nullable wrapping stays correct.
- Keep nullability/array decoration in `columnToTsType` / the `z.array` wrap, not in the base switches.
