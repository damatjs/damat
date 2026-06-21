# Generate commands

The `generate` group lives in `src/cli/commands/generate/`. The parent
`generate` command (`index.ts`) only lists subcommands; today there is a single
leaf, `generate:types`.

```
generate (parent, lists subcommands)
└─ generate:types  → discoverModels → toModuleSchema → generateFilesMap
                        → augmentWithLinks → write
```

## `generate:types <module>` — `src/cli/commands/generate/types.ts`

Generate TypeScript type files from a module's ORM model definitions. Requires
the module name as `ctx.args[0]` (error if missing). No database connection.

Pipeline:

1. Load modules: `loadModules("damat.config.ts", ctx.cwd)`; error if empty; look
   up `modules[moduleName]` (error if absent).
2. **Link short-circuit**: if `moduleConfig.kind === "link"` (a `link:<owner>`
   module discovered from `config.links`), log a notice that link modules don't
   emit their own types and return `0`. Link relationships surface as fields on
   the *linked* modules' types instead (step 6).
3. **Verify models dir**: `resolvedModelsDir = resolveModelsPath(
   moduleConfig.resolve)` (= `<resolve>/models`); error if it does not exist.
4. **Discover models**: `models = await discoverModels(moduleConfig.resolve)`
   (from `@damatjs/orm-migration`).
5. **Build schema**: `schema = toModuleSchema(moduleName, models)` (from
   `@damatjs/orm-model`).
6. **Generate files**: `filesMap = generateFilesMap(schema, {}, ctx.logger)`
   (from `@damatjs/codegen`) — a `Map<fileName, content>` that includes an
   `index.ts` plus one file per table.
7. **Weave link augmentations**: `augmentWithLinks(...)` inspects every
   `link:<owner>` module in the container, and for each link this module
   participates in adds the linked entity as an optional field on its interface
   via a sibling `<table>.links.ts` (declaration merging), re-exported from
   `index.ts`. No-op when no link modules exist — the output stays model-only.
8. **Write output**: `outputDir = resolveTypesPath(moduleConfig.resolve)` (=
   `<resolve>/types`); `mkdir -p` if missing; write each `[fileName, content]`
   to `outputDir/fileName`.
9. Log the output dir and the generated file names; `logger.success`.

Any thrown error → `logger.error("Failed to generate types: …")`, return `1`.
Success → `0`.

```bash
bun damat codegen user
# Output: <project>/src/modules/user/types
# Files: index.ts, <table>.ts, ...
```

## Inputs and outputs

| Concern | Source / target | Resolver |
|---|---|---|
| Models read from | `<module.resolve>/models` | `resolveModelsPath` |
| Types written to | `<module.resolve>/types` | `resolveTypesPath` |
| Schema name | the CLI `<module>` arg | passed straight to `toModuleSchema` |
| Link defs read from | each `link:<owner>` module's `index.ts` (`links` export) | `loadModules` (via `config.links`) |
| Link fields rendered by | `renderLinkAugmentations` | `@damatjs/link` |

## Gotchas

- The models directory **must already exist** — `generate:types` validates it up
  front and errors rather than creating it. (Contrast with the output `types/`
  dir, which is created on demand.)
- `generateFilesMap` is given an empty options object (`{}`) and the command's
  `ctx.logger`; per-codegen options are not surfaced through the CLI yet.
- Files are written verbatim from the map keys — codegen owns the file naming
  (e.g. `index.ts` + per-table files). The CLI does not post-process them.
- Like the migrate commands, `@damatjs/codegen`, `@damatjs/orm-model`,
  `@damatjs/orm-migration`, and `@damatjs/link` are loaded via `await import(...)`
  inside the handler.
- **Link modules don't generate types** — `generate:types link:<owner>` is a
  no-op that prints a notice and exits 0. To pick up linked fields, run
  `generate:types` for the linked modules themselves.
- **Link augmentation is best-effort**: if a link directory fails to import or a
  referenced table can't be resolved, `augmentWithLinks` logs a `warn` and skips
  that augmentation rather than failing the command. The base model types are
  always written.
- The `<table>.links.ts` files declaration-merge onto the base interfaces and
  carry an "auto-generated" banner; they are overwritten on every run, so don't
  hand-edit them.
