# @damatjs/schema-codegen

Pure TypeScript and Zod source generation from serialized Damat module schemas.

The package consumes `ModuleSchema` values from `@damatjs/orm-type` and returns
source strings or deterministic in-memory file maps. It performs no filesystem
I/O, model discovery, framework integration, or database access.

## Install

```bash
bun add @damatjs/schema-codegen
```

## Quick start

```ts
import { generateFilesMap, generateTypes } from "@damatjs/schema-codegen";
import type { ModuleSchema } from "@damatjs/orm-type";

const schema: ModuleSchema = {
  moduleName: "store",
  tables: [
    {
      name: "product",
      columns: [
        { name: "id", type: "uuid", nullable: false, primaryKey: true },
        { name: "name", type: "text", nullable: false },
      ],
    },
  ],
};

const combined = generateTypes(schema);
const files = generateFilesMap(schema);
```

## API

- `columnToTsType` and `columnToZodSchema` render individual columns.
- `generateTypes` and `generateZodTypes` render combined module source.
- `generateTableFile` and `generateZodFile` render one table.
- `generateFilesMap` returns the file-per-table layout.
- `generateEnumTypes`, `generateEnumsFile`, and `getTableEnums` render enums.
- `generateRowInterface`, `generateNewType`, and `generateUpdateType` render
  TypeScript fragments.
- `generateNewZodSchema`, `generateUpdateZodSchema`,
  `generateQueryZodSchema`, `generateIdZodSchema`, and
  `generateParamsZodSchema` render focused Zod fragments.
- `buildRelationMap` and `relationFields` render loaded relation fields.
- `GenerationLogger` is the optional structural `debug`/`info` logging surface.

See [the internals guide](./docs/README.md) for the source layout and invariants.

## License

MIT
