# Tooling — migrations & codegen

Source: `src/tooling/migration.ts`, `src/tooling/codegen.ts`.

Helpers that operate on a **standalone module package** — no `damat.config.ts`
required. They locate the module dir, read its manifest, and drive the ORM
migration/codegen packages directly. The `damat` CLI calls these for a module
package's own migrate/codegen commands.

`createModuleMigration` (diff → SQL) and `generateModuleTypes` work offline
against the model files and snapshot. `runModuleMigration` and
`runModuleMigrationStatus` connect to `DATABASE_URL` to apply / report the
module's own migrations against a real database.

## `createModuleMigration`

```ts
interface ModuleMigrationResult {
  hasChanges: boolean;
  filePath?: string;
}

function createModuleMigration(
  packageDir: string,
): Promise<ModuleMigrationResult>;
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

## `runModuleMigration`

```ts
interface RunModuleMigrationResult {
  moduleName: string;
  applied: string[]; // migration names applied this run
  pending: string[]; // names that were pending before the run
  success: boolean;
  error?: Error;
  hadMigrations: boolean; // false when the module has no migrations dir yet
}

function runModuleMigration(
  packageDir: string,
): Promise<RunModuleMigrationResult>;
```

**Applies the module's own migration files to `DATABASE_URL`** — scoped to this
module only (`migration.ts`):

1. `moduleDir = locateModuleDir(packageDir)`; `manifest = readModuleManifest(moduleDir)`.
2. If the migrations dir is missing, return early with `hadMigrations: false`
   (nothing to apply — run `createModuleMigration` first).
3. `resolveDatabaseConfig({})` (DATABASE_URL env) → connect via
   `ConnectionManager` (same wiring as `bootModule`).
4. `runMigrations(pool, { [manifest.name]: { … resolve: moduleDir } })` (from
   `@damatjs/orm-migration`) — a single-module container, so only this module's
   migrations run, tracked under `manifest.name`.
5. Disconnect and return the applied/pending names.

Idempotent: migrations already recorded under the module's name are skipped, so
re-running applies nothing.

```ts
const r = await runModuleMigration(process.cwd());
if (r.applied.length) console.log("applied", r.applied.join(", "));
```

## `runModuleMigrationStatus`

```ts
interface ModuleMigrationStatusResult {
  moduleName: string;
  applied: number;
  pending: number;
  migrations: { name: string; applied: boolean }[];
  hadMigrations: boolean;
}

function runModuleMigrationStatus(
  packageDir: string,
): Promise<ModuleMigrationStatusResult>;
```

**Reports which of the module's migrations are applied vs pending** against
`DATABASE_URL`, without changing anything. Discovers the migration files
(`discoverModuleMigrations(moduleDir)`) and cross-references the tracking table
(`MigrationTracker.getApplied(manifest.name)`) — keyed by the same module name
`runModuleMigration` records under, so counts stay consistent.

## `generateModuleTypes`

```ts
interface ModuleCodegenResult {
  outputDir: string;
  files: string[];
}

function generateModuleTypes(
  packageDir: string,
  logger: ILogger,
): Promise<ModuleCodegenResult>;
```

Generates TypeScript row types + zod schemas for the module's models
(`codegen.ts`):

1. `moduleDir = locateModuleDir(packageDir)`; `manifest = readModuleManifest(moduleDir)`.
2. `models = await discoverModels(moduleDir)` (from `@damatjs/orm-migration`).
3. `schema = toModuleSchema(manifest.name, models)` (from `@damatjs/orm-model`).
4. `filesMap = generateFilesMap(schema, {}, logger)` (from `@damatjs/codegen`).
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
packages (`orm-migration`, `orm-model`, `codegen`). This package's job is to
make those usable _for a single module package_ without app config.

## Gotchas

- The migrations output of `createModuleMigration` lands wherever
  `createDiffMigration` writes for `manifest.name` + `moduleDir`; the **types**
  output is controlled by `manifest.paths.types` (default `./types`).
- `generateModuleTypes` requires a `logger` argument; `createModuleMigration` does
  not. Don't assume a symmetric signature.
- `createModuleMigration` and `generateModuleTypes` do not touch the database —
  they diff against the snapshot and read model files. `runModuleMigration` /
  `runModuleMigrationStatus` do connect (they need `DATABASE_URL`), but stay
  scoped to this module. During an actual `damat module dev`/test boot, applying
  migrations is the harness/runtime's job (`applyModuleMigrations`, see
  [harness.md](./harness.md)); the tooling functions are the explicit
  CLI-invoked path.
- Re-running codegen overwrites files in the types dir; treat that dir as
  generated output, not hand-edited source.
