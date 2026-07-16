# @damatjs/schema-codegen internals

`@damatjs/schema-codegen` is a pure source renderer. Its only runtime dependency
is `@damatjs/orm-type`.

## Source map

| Directory | Responsibility |
| --- | --- |
| `src/type-mapping/` | PostgreSQL column types to TypeScript or Zod strings |
| `src/render/` | Enum, row, mutation, relation-aware, and Zod source fragments |
| `src/relation/` | Relation grouping and loaded-field rendering |
| `src/generator/` | Combined files, per-table files, and file maps |
| `src/types/` | Public generation options and result types |
| `src/logger.ts` | Optional structural logger with a no-op default |

## Invariants

- Public generation functions return strings or `Map<string, string>`.
- Output ordering, banners, filenames, and whitespace are deterministic.
- Type strings reflect values returned by the PostgreSQL driver.
- Nullability and array wrapping are applied after base type mapping.
- The package never reads or writes files and never imports the Damat framework.
