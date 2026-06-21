# @damatjs/codegen

> Generate TypeScript types and Zod schemas from Damat ORM model schemas.

`@damatjs/codegen` turns a serialized `ModuleSchema` (from [`@damatjs/orm-type`](../type/README.md)) into ready-to-write TypeScript source: row interfaces, `New*`/`Update*` mutation types, enum unions, relation fields, and matching Zod validation schemas (`new`/`update`/`query`/`id`). It is a pure string-generation library — it produces file contents, never writing to disk itself — and is consumed by the ORM CLI and the framework's module system to keep generated DB types in sync with your models.

Part of the [Damat](../../../README.md) monorepo · [Full guide](../../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

```bash
bun add @damatjs/codegen
```

Inside this monorepo it is referenced as a workspace dependency with `"@damatjs/codegen": "*"`.

## When to use

Use this package to:

- Generate one combined `.ts` type file for a module (`generateTypes`) or all Zod schemas in one file (`generateZodTypes`).
- Generate a **file-per-table** layout — `<table>.ts`, `<table>.zod.ts`, `enums.ts`, `index.ts` — as an in-memory map ready to write (`generateFilesMap`).
- Map a single column to its TypeScript type (`columnToTsType`) or Zod schema (`columnToZodSchema`).

Do **not** use it to:

- Define or build models — that is [`@damatjs/orm-model`](../model/README.md).
- Read the database or run migrations — codegen never touches a connection; it only consumes a `ModuleSchema`.
- Write files to disk — it returns strings/maps; the caller persists them.

## Quick start

```ts
import { generateTypes, generateFilesMap } from "@damatjs/codegen";
import type { ModuleSchema } from "@damatjs/orm-type";

const schema: ModuleSchema = {
  moduleName: "store",
  tables: [
    {
      name: "product",
      columns: [
        { name: "id", type: "uuid", nullable: false, primaryKey: true },
        { name: "name", type: "text", nullable: false },
        { name: "price", type: "numeric", nullable: true },
      ],
    },
  ],
  enums: [{ name: "status", values: ["pending", "shipped", "delivered"] }],
  relationships: [],
};

// One combined types file (string)
const types = generateTypes(schema);
// → "export type StatusEnum = 'pending' | 'shipped' | 'delivered';"
//   "export interface Product { id: string; name: string; price: number | null; }"
//   "export type NewProduct = { name: string; price?: number | null; };"
//   "export type UpdateProduct = Partial<Omit<Product, 'id'>>;"

// File-per-table map: write each [filename, contents] pair yourself
const files = generateFilesMap(schema); // Map: "product.ts", "product.zod.ts", "enums.ts", "index.ts"
for (const [name, contents] of files) {
  // fs.writeFileSync(path.join(outDir, name), contents)
}
```

## API

| Export | Kind | Summary |
| --- | --- | --- |
| `columnToTsType(col)` | function | `ColumnSchema` → TS type string (handles enum alias, array, nullable). |
| `columnToZodSchema(col)` | function | `ColumnSchema` → Zod schema string (no `.optional()`/`.nullable()`). |
| `DEFAULT_AUTO_FIELDS` | const `Set<string>` | Columns omitted from `New*` types: `id`, `createdAt`, `created_at`, `updatedAt`, `updated_at`. |
| `generateTypes(schema, opts?)` | function | One combined `.ts` string: enums + per-table interface/`New`/`Update`. |
| `generateZodTypes(schema, opts?)` | function | One combined `.ts` string of all Zod schemas. |
| `generateTableFile(table, schema, autoFields, banner)` | function | Single table's `.ts` (with enum/relation imports). |
| `generateZodFile(table, schema, banner)` | function | Single table's Zod `.ts`. |
| `generateFilesMap(schema, opts?, logger?)` | function | `Map<filename, contents>` for the file-per-table layout. |
| `buildRelationMap(relationships)` | function | Group `RelationSchema[]` by source table. |
| `relationFields(relations)` | function | Optional loaded-relation interface fields. |
| `GenerateTypesOptions`, `GeneratedFilesMap` | types | Options (`autoFields`, `banner`) and the files-map result type. |

**Subpath exports:** `@damatjs/codegen/types` is declared in `package.json` (maps to `dist/types/index.js`). It is a build-output subpath; the public, source-backed surface is the root `.` export above.

## How it fits

**Depends on:**

- `@damatjs/orm-type` — `ColumnSchema`, `ColumnType`, `ModuleSchema`, `EnumSchema`, `RelationSchema`.
- `@damatjs/orm-model` — workspace dependency.
- `@damatjs/logger` (peer) — `getLogger`/`ILogger` for progress logging; the file-per-table generator accepts an injected logger.

It performs **no I/O** and opens **no database connection**.

**Depended on by (in-repo):** `@damatjs/orm-cli`, `@damatjs/module`.

## Documentation

- [Internals & module map](./docs/README.md)
- [Type mapping](./docs/type-mapping.md) · [Generators](./docs/generators.md)
- [Damat full guide](../../../docs/GUIDE.md)

## License

MIT
