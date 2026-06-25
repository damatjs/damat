# @damatjs/codegen internals

Maintainer-facing documentation for `@damatjs/codegen`. For the public overview and quick start, see the [package README](../README.md).

The codegen package is a **pure string factory**. It takes a `ModuleSchema` and produces TypeScript source as strings — interfaces, mutation types, enum unions, relation fields, and Zod schemas. It never writes files and never connects to a database; callers (the ORM CLI, the module system) decide where the output goes.

There are two conceptual halves:

1. **Type mapping** — per-column primitives: `ColumnSchema` → a TS type string, or → a Zod schema string.
2. **Generators** — compose those primitives (plus relations and enums) into whole files or file maps.

## Module map

| File / dir | Responsibility |
| --- | --- |
| `src/index.ts` | Barrel: re-exports `columnToTsType`, `columnToZodSchema`, `defaults`, `generator`, `relation`. |
| `src/columnToTsType.ts` | `ColumnSchema` → TypeScript type string (enum alias, array, nullable, parenthesization). → [type-mapping.md](./type-mapping.md) |
| `src/columnToZodSchema.ts` | `ColumnSchema` → Zod schema string (base validator per pg type). → [type-mapping.md](./type-mapping.md) |
| `src/utils/pgTypeToTsBase.ts` | The big `ColumnType` → base TS string switch; `enumTypeToTsBase` for value unions. |
| `src/defaults.ts` | `DEFAULT_AUTO_FIELDS` — columns excluded from `New*` types. |
| `src/utils/stringConvertor.ts` | `toPascalCase`, `toCamelCase`, `toEnumTypeName`. |
| `src/utils/typeOptions.ts` | `GenerateTypesOptions`, `GeneratedFilesMap`. |
| `src/utils/rowInterface.ts` | `generateRowInterface` — the table row interface (columns + relation fields). |
| `src/utils/newType.ts` | `generateNewType` — the `New*` insert type. |
| `src/utils/updateType.ts` | `generateUpdateType` — the `Update*` partial type. |
| `src/utils/enum.ts` | `generateEnumTypes`, `generateEnumsFile`, `getTableEnums`. |
| `src/utils/zodSchemas.ts` | `generateNewZodSchema`, `generateUpdateZodSchema`, `generateQueryZodSchema`, `generateIdZodSchema`, `generateParamsZodSchema`. |
| `src/relation/map.ts` | `buildRelationMap` — group relations by `fromTable`. |
| `src/relation/relationFields.ts` | `relationFields` — optional loaded-relation interface fields. |
| `src/generator/generateTypes.ts` | `generateTypes` (combined types file) + `generateZodTypes` (combined Zod file). → [generators.md](./generators.md) |
| `src/generator/generateTableFile.ts` | `generateTableFile` — one table's `.ts` with imports. → [generators.md](./generators.md) |
| `src/generator/generateZodFile.ts` | `generateZodFile` — one table's Zod `.ts`. → [generators.md](./generators.md) |
| `src/generator/generateFilesMap.ts` | `generateFilesMap` — the file-per-table layout. → [generators.md](./generators.md) |
| `src/generator/helpers.ts` | `tableToFileName` (`_`→`-`), `getRelationImports`. |

## Architecture overview

```
ModuleSchema
   │
   ├── per column ──► columnToTsType  ──► pgTypeToTsBase / toEnumTypeName
   │                  columnToZodSchema ─► (inline pg-type switch)
   │
   ├── per table  ──► generateRowInterface / generateNewType / generateUpdateType
   │                  generate{New,Update,Query,Id,Params}ZodSchema
   │                  relationFields (from buildRelationMap / getRelationImports)
   │
   └── per module ──► generateTypes / generateZodTypes  (single file)
                      generateFilesMap                  (file-per-table map)
```

## Naming conventions (enforced by `stringConvertor.ts`)

- Table → type name: `toPascalCase` (`order_item` → `OrderItem`).
- Enum name → alias: `toEnumTypeName` = PascalCase + `Enum` suffix (`product_status` → `ProductStatusEnum`).
- Table → filename: `tableToFileName` replaces `_` with `-` (`order_item` → `order-item.ts`).
- Zod schema/const names use `toCamelCase` of the PascalCase type (`order_item` → `orderItem...Schema`).

## Invariants & design decisions

- **Pure, no I/O.** Every function returns strings or a `Map<string,string>`. Disk writes belong to the caller.
- **Type strings target what the `pg` driver actually returns at runtime**, not the conceptually ideal type — e.g. `bigint` → `bigint`, `bytea` → `Buffer`, `timestamp` → `Date`, geometric/range types → inline object literals. See [type-mapping.md](./type-mapping.md).
- **Nullability and arrays are applied by `columnToTsType`, not by the base mapper.** `pgTypeToTsBase`/the Zod switch return the *base* type; wrapping (`Array<...>`, `| null`, `z.array(...)`) happens one layer up.
- **Auto-managed and timestamp/soft-delete columns are filtered consistently.** `New*` types and `new` Zod schemas omit `DEFAULT_AUTO_FIELDS` plus `deleted_at`/`created_at`/`updated_at`; update schemas also skip primary keys.
- **Enum columns resolve to the named alias for TS**, but Zod inlines the literal value union (`z.enum([...])`) when the enum values are known.
- **Relation fields are optional** (`field?: Type`) because they are only present when explicitly loaded.

## Split docs

- [type-mapping.md](./type-mapping.md) — `columnToTsType`, `columnToZodSchema`, `pgTypeToTsBase`, enum/array/nullable handling.
- [generators.md](./generators.md) — interface/`New`/`Update` builders, Zod builders, relations, single-file vs file-map output, options.
