# Generate commands

The `generate` group lives in `src/cli/commands/generate/`. The parent
`generate` command (`index.ts`) only lists subcommands; today there is a single
leaf, `generate:types`.

```
generate (parent, lists subcommands)
└─ generate:types  → discoverModels → toModuleSchema → generateFilesMap → write
```

## `generate:types <module>` — `src/cli/commands/generate/types.ts`

Generate TypeScript type files from a module's ORM model definitions. Requires
the module name as `ctx.args[0]` (error if missing). No database connection.

Pipeline:

1. Load modules: `loadModules("damat.config.ts", ctx.cwd)`; error if empty; look
   up `modules[moduleName]` (error if absent).
2. **Verify models dir**: `resolvedModelsDir = resolveModelsPath(
   moduleConfig.resolve)` (= `<resolve>/models`); error if it does not exist.
3. **Discover models**: `models = await discoverModels(moduleConfig.resolve)`
   (from `@damatjs/orm-migration`).
4. **Build schema**: `schema = toModuleSchema(moduleName, models)` (from
   `@damatjs/orm-model`).
5. **Generate files**: `filesMap = generateFilesMap(schema, {}, ctx.logger)`
   (from `@damatjs/orm-codegen`) — a `Map<fileName, content>` that includes an
   `index.ts` plus one file per table.
6. **Write output**: `outputDir = resolveTypesPath(moduleConfig.resolve)` (=
   `<resolve>/types`); `mkdir -p` if missing; write each `[fileName, content]`
   to `outputDir/fileName`.
7. Log the output dir and the generated file names; `logger.success`.

Any thrown error → `logger.error("Failed to generate types: …")`, return `1`.
Success → `0`.

```bash
bun damat-orm generate:types user
# Output: <project>/src/modules/user/types
# Files: index.ts, <table>.ts, ...
```

## Inputs and outputs

| Concern | Source / target | Resolver |
|---|---|---|
| Models read from | `<module.resolve>/models` | `resolveModelsPath` |
| Types written to | `<module.resolve>/types` | `resolveTypesPath` |
| Schema name | the CLI `<module>` arg | passed straight to `toModuleSchema` |

## Gotchas

- The models directory **must already exist** — `generate:types` validates it up
  front and errors rather than creating it. (Contrast with the output `types/`
  dir, which is created on demand.)
- `generateFilesMap` is given an empty options object (`{}`) and the command's
  `ctx.logger`; per-codegen options are not surfaced through the CLI yet.
- Files are written verbatim from the map keys — codegen owns the file naming
  (e.g. `index.ts` + per-table files). The CLI does not post-process them.
- Like the migrate commands, `@damatjs/orm-codegen`, `@damatjs/orm-model`, and
  `@damatjs/orm-migration` are loaded via `await import(...)` inside the handler.
