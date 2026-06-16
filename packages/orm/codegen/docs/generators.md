# Generators

Sources: [`src/generator/`](../src/generator), [`src/utils/`](../src/utils), [`src/relation/`](../src/relation)

## Responsibility

Compose the per-column primitives (`columnToTsType`, `columnToZodSchema`) plus enums and relations into whole TypeScript files. There are two output strategies:

- **Combined** — everything for a module in one string (`generateTypes`, `generateZodTypes`).
- **File-per-table** — a `Map<filename, contents>` with one file per table, an `enums.ts`, and an `index.ts` (`generateFilesMap`, built from `generateTableFile` + `generateZodFile`).

## Options

```ts
// src/utils/typeOptions.ts
interface GenerateTypesOptions {
  autoFields?: string[];     // extra column names to omit from New* types
  banner?: string | false;   // leading comment; false = none; default = "// This file is auto-generated..."
}
type GeneratedFilesMap = Map<string, string>; // filename → file contents
```

`autoFields` is merged with `DEFAULT_AUTO_FIELDS` (`id`, `createdAt`, `created_at`, `updatedAt`, `updated_at`).

## Per-table type builders (`src/utils/`)

### `generateRowInterface(table, relations)` — `rowInterface.ts`

Emits `export interface <Pascal(table)> { ... }`: every column as `name: columnToTsType(col);`, then — if the table has relations — a `// loaded relations` comment followed by the optional fields from `relationFields(relations)`.

### `generateNewType(table, autoFields)` — `newType.ts`

Emits `export type New<Pascal> = { ... };`. Skips any column in `autoFields`, and additionally never emits `deleted_at`, `created_at`, `updated_at`. A field is optional (`name?:`) when the column has a `default` **or** is `nullable`.

### `generateUpdateType(table)` — `updateType.ts`

Emits `export type Update<Pascal> = Partial<Omit<<Pascal>, '<pk>'>>;` (omitting the primary-key column(s); multiple PKs become `'a' | 'b'`). With no PK, falls back to `Partial<<Pascal>>`.

## Enums (`src/utils/enum.ts`)

- `generateEnumTypes(schema)` → `string[]` of `export type <Name>Enum = 'a' | 'b';` lines (used by `generateTypes`).
- `generateEnumsFile(schema, banner)` → full `enums.ts` contents, or `null` when the module has no enums.
- `getTableEnums(table, allEnums)` → the subset of enums actually referenced by a table's columns (drives per-file enum imports).

## Relations (`src/relation/`)

- `buildRelationMap(relationships)` (`map.ts`) → `Map<fromTable, RelationSchema[]>`.
- `relationFields(relations)` (`relationFields.ts`) → optional interface fields:
  - `belongsTo` → singular `field?: Target` where `field` is the FK column with `_id` stripped (e.g. `user_id` → `user`), falling back to `rel.from` when no `linkedBy`.
  - `hasMany` → `field?: Target[]` using `rel.from` as the field name.
  - `hasOne` → `field?: Target` using `rel.from`.
  - `Target` type name is `toPascalCase(rel.to)`.

Verified (from `tests/relation.test.ts`): a `belongsTo` with `linkedBy: ["user_id"]` and `to: "users"` yields `  user?: User;`; a `hasMany` with `from: "posts"`, `to: "posts"` yields `  posts?: Post[];`.

## Zod schema builders (`src/utils/zodSchemas.ts`)

All four take `(table, ...)` and return `string[]`. Enum columns whose values are known are replaced with `z.enum(['a','b'])` (looked up in `allEnums`).

- `generateNewZodSchema(table, autoFields, allEnums)` — `new<Pascal>Schema = z.object({...}).strict()` + `type New<Pascal>Input = z.infer<...>`. Skips `autoFields` and `deleted_at`/`created_at`/`updated_at`. Nullable → `.nullable().optional()`; has default → `.optional()`; else required.
- `generateUpdateZodSchema(table, allEnums)` — `update<Pascal>Schema` + `Update<Pascal>Input`. Skips primary keys and `id`/timestamps/soft-delete. Every field `.optional()` (nullable also `.nullable()`).
- `generateQueryZodSchema(table, allEnums)` — `<camel>QuerySchema` + `<Pascal>Query`. Every column optional; integer/bigint/boolean columns become `z.coerce.*` (query strings); adds `limit`/`offset`/`orderBy`/`orderDir` pagination fields.
- `generateIdZodSchema(table)` — `<camel>IdSchema` + `<Pascal>Id` from the PK column's type (`uuid` → `z.string().uuid()`, integer/serial → `z.coerce.number().int().positive()`, bigint → `z.coerce.bigint()`, else `z.string()`). Returns `[]` if there's no PK.

## Combined output (`generator/generateTypes.ts`)

### `generateTypes(schema, options?)`

1. Merge `autoFields`; resolve `banner`.
2. `buildRelationMap(schema.relationships ?? [])`.
3. Push enum lines (if any), then per table push `generateRowInterface` (with that table's relations), `generateNewType`, `generateUpdateType`.
4. Join sections with blank lines; prepend banner unless disabled.

### `generateZodTypes(schema, options?)`

Same skeleton but the first section is `import { z } from "@damatjs/deps/zod";`, then per table the four Zod builders. Empty sections are filtered out.

Both log start/completion via `getLogger()` (`@damatjs/logger`).

## Per-file output (`generator/generateTableFile.ts`, `generateZodFile.ts`)

### `generateTableFile(table, schema, autoFields, banner)`

Builds one table's `.ts`. Computes imports: `import type { ...Enum } from "./enums";` for referenced enums (via `getTableEnums`), and `import type { Target } from "./<target-file>";` for each relation target (deduplicated by type name, via `getRelationImports` + `tableToFileName`). Then the interface, `New`, and `Update` sections.

### `generateZodFile(table, schema, banner)`

One table's Zod `.ts`: the `z` import, optional enum-type import, then the four Zod schema blocks. Uses `DEFAULT_AUTO_FIELDS` directly (does not accept extra `autoFields`).

## File map (`generator/generateFilesMap.ts`)

### `generateFilesMap(schema, options?, logger?)`

Returns a `GeneratedFilesMap`:

- `enums.ts` — only if the module has enums.
- For each table: `<table>.ts` (via `generateTableFile`) and `<table>.zod.ts` (via `generateZodFile`). Filenames use `tableToFileName` (`order_item` → `order-item`).
- `index.ts` — re-exports `./enums` (if present) and, per table, `./<table>` and `./<table>.zod`.

Accepts an optional injected `ILogger` (falls back to `getLogger()`). Verified file set for a 2-table+enum module (from `tests/codegen.test.ts`): `enums.ts`, `product.ts`, `order-item.ts`, `index.ts` (plus the `.zod.ts` files), and `index.ts` containing `export * from "./enums";` etc. When there are no enums, `enums.ts` is omitted and the index doesn't reference it.

## Edge cases & gotchas

- **`generateTableFile` requires the full `schema`, not just the table** — it needs `schema.enums` and `schema.relationships` to compute imports.
- **Relation imports are deduped by type name**, so two relations to the same target produce a single `import type`.
- **`New*` and `new` Zod schema field filtering must stay in lockstep.** Both omit `autoFields` and `deleted_at`/`created_at`/`updated_at`; if you change one, change the other or the type and its validator diverge.
- **Query schema always appends pagination fields**, so generated query types always include `limit`/`offset`/`orderBy`/`orderDir`.
- **`banner: false` disables the banner; omitting it uses the default.** A custom string replaces the default verbatim (newline included by convention).
- **The `index.ts` banner is included like every other file** when banners are enabled.

## Safe extension

- New per-table artifact: add a builder returning `string[]`, push it in `generateTypes`/`generateTableFile` (and the file map if it should be its own file), and export it from the relevant barrel.
- New file in the map: `result.set("<name>.ts", ...)` in `generateFilesMap` and add a matching `export * from "./<name>";` to the index assembly.
- New relation rendering: extend `relationFields` (interface side) and `getRelationImports`/`generateTableFile` (import side) together.
- Keep generators pure string producers; never write to disk inside this package.
