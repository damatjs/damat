# Tooling — migrations & codegen

Source: `src/tooling/migration.ts`, `src/tooling/codegen.ts`.

Two helpers that operate on a **standalone module package** — no `damat.config.ts`
required. They locate the module dir, read its manifest, and drive the ORM
migration/codegen packages directly. The `damat` CLI calls these for a module
package's own migrate/codegen commands.

## `createModuleMigration`

```ts
interface ModuleMigrationResult {
  hasChanges: boolean;
  filePath?: string;
}

function createModuleMigration(packageDir: string): Promise<ModuleMigrationResult>;
```

Creates a migration by **diffing the module's models against the last schema
snapshot** (`migration.ts`):

1. `moduleDir = locateModuleDir(packageDir)`.
2. `manifest = readModuleManifest(moduleDir)`.
3. `result = await createDiffMigration(manifest.name, moduleDir)` (from
   `@damatjs/orm-migration`).
4. Return `{ hasChanges: result.hasChanges ?? Boolean(result.filePath), filePath? }`.

`hasChanges` is false (and `filePath` absent) when the models already match the
snapshot — nothing is written.

```ts
const { hasChanges, filePath } = await createModuleMigration(process.cwd());
if (hasChanges) console.log("wrote", filePath);
```

## `generateModuleTypes`

```ts
interface ModuleCodegenResult {
  outputDir: string;
  files: string[];
}

function generateModuleTypes(packageDir: string, logger: ILogger): Promise<ModuleCodegenResult>;
```

Generates TypeScript row types + zod schemas for the module's models
(`codegen.ts`):

1. `moduleDir = locateModuleDir(packageDir)`; `manifest = readModuleManifest(moduleDir)`.
2. `models = await discoverModels(moduleDir)` (from `@damatjs/orm-migration`).
3. `schema = toModuleSchema(manifest.name, models)` (from `@damatjs/orm-model`).
4. `filesMap = generateFilesMap(schema, {}, logger)` (from `@damatjs/orm-codegen`).
5. `outputDir = join(moduleDir, manifest.paths?.types ?? "./types")`; `mkdir -p` it.
6. Write each `[fileName, content]` from the map into `outputDir`.
7. Return `{ outputDir, files }` (the filenames written).

```ts
const { outputDir, files } = await generateModuleTypes(process.cwd(), logger);
console.log(`generated ${files.length} files in ${outputDir}`);
```

## How they relate

Both share the same front end — `locateModuleDir` + `readModuleManifest` — so they
work on a module package laid out with `src/module.json` or the legacy
root-`module.json`. They are deliberately thin: all real work lives in the ORM
packages (`orm-migration`, `orm-model`, `orm-codegen`). This package's job is to
make those usable *for a single module package* without app config.

## Gotchas

- The migrations output of `createModuleMigration` lands wherever
  `createDiffMigration` writes for `manifest.name` + `moduleDir`; the **types**
  output is controlled by `manifest.paths.types` (default `./types`).
- `generateModuleTypes` requires a `logger` argument; `createModuleMigration` does
  not. Don't assume a symmetric signature.
- These do not touch the database — they diff against the snapshot and read model
  files. Applying migrations is the harness/runtime's job (`applyModuleMigrations`,
  see [harness.md](./harness.md)).
- Re-running codegen overwrites files in the types dir; treat that dir as
  generated output, not hand-edited source.
