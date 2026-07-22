# Tooling — migrations & codegen

Source: `src/tooling/migration-*.ts`, `src/tooling/codegen.ts`.

Helpers that operate on a **standalone module package** — no `damat.config.ts`
required. They locate the module dir, read its manifest, and drive the ORM
migration and module-generator owners directly. The `damat` CLI calls these for
a module package's own migrate/codegen commands.

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
snapshot** (`migration-create.ts`):

1. `moduleDir = locateModuleDir(packageDir)`.
2. `manifest = readModuleManifest(moduleDir)`.
3. Resolve the manifest's model and migration paths. Legacy modules without a
   models directory fall back to their aggregate entry directory.
4. Call `createDiffMigration` with the resolved models provider and explicit
   migrations directory.
5. Return `{ hasChanges: result.hasChanges ?? Boolean(result.filePath), filePath? }`.

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
module only (`migration-run.ts`):

1. `moduleDir = locateModuleDir(packageDir)`; `manifest = readModuleManifest(moduleDir)`.
2. If the migrations dir is missing, return early with `hadMigrations: false`
   (nothing to apply — run `createModuleMigration` first).
3. `resolveDatabaseConfig({})` (DATABASE_URL env) → connect via
   `ConnectionManager` (same wiring as `bootModule`).
4. `runMigrations` receives a single-module descriptor with the manifest's
   explicit migrations directory, so only those files run and are tracked
   under `manifest.name`.
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
from the manifest-declared directory and cross-references the tracking table
(`MigrationTracker.getApplied(manifest.name)`) — keyed by the same module name
`runModuleMigration` records under, so counts stay consistent.

## `generateModuleTypes`

```ts
interface ModuleCodegenResult {
  outputDir: string;
  files: string[];
  scaffolded: string[];
}

function generateModuleTypes(
  packageDir: string,
  logger: ILogger,
): Promise<ModuleCodegenResult>;
```

Generates TypeScript row types + Zod schemas, the registry, and missing CRUD
scaffolds for the module's models (`codegen.ts`):

1. `moduleDir = locateModuleDir(packageDir)`; `manifest = readModuleManifest(moduleDir)`.
2. Resolve the manifest's models, entry/service, types, workflows, and routes
   paths.
3. Call `runCodegen` from `@damatjs/module-generator` with portable module and
   workflow aliases.
4. The generator discovers models, uses `@damatjs/schema-codegen`, regenerates
   types and the registry, creates missing scaffolds, and rebuilds barrels.
5. Return its output directory, generated files, and scaffolded files.

```ts
const { outputDir, files } = await generateModuleTypes(process.cwd(), logger);
console.log(`generated ${files.length} files in ${outputDir}`);
```

## How they relate

Both share the same front end — `locateModuleDir` + `readModuleManifest` — so they
work on a module package with root `damat.json`. They are deliberately thin: migration work lives in
the ORM packages and generation lives in `@damatjs/module-generator`. This
package makes those owners usable _for a single module package_ without app
config.

## Gotchas

- Migration, type, workflow, and route output follows the corresponding
  manifest paths. Model discovery follows `manifest.paths.models`.
- `generateModuleTypes` requires a `logger` argument; `createModuleMigration` does
  not. Don't assume a symmetric signature.
- `createModuleMigration` and `generateModuleTypes` do not touch the database —
  they diff against the snapshot and read model files. `runModuleMigration` /
  `runModuleMigrationStatus` do connect (they need `DATABASE_URL`), but stay
  scoped to this module. `damat module dev` owns one combined module/system
  migration pass before durability and workers initialize. The harness uses the
  same capability-to-catalog mapping with the declared module migration path;
  explicit migration commands remain module-only.
- Re-running codegen overwrites generated types and the registry, but never
  overwrites existing CRUD scaffold files.
