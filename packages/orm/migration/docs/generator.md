# Generator

Source: [`src/generator/`](../src/generator) · Templating: [`src/utils/`](../src/utils)

## Responsibility

Create new migration `.sql` files for a module from its current models. The generator is **offline** — it never touches the database. It discovers models, builds the current `ModuleSchema` via `@damatjs/orm-model`, then uses `@damatjs/orm-processor` to either emit a full baseline (first migration) or diff against the on-disk snapshot (subsequent migrations), writes a templated `.sql` file, and updates `schema-snapshot.json`.

## `createMigration` — auto-router

Source: [`index.ts`](../src/generator/index.ts)

```ts
export const DEFAULT_MODULES_DIR = "src/modules";

export async function createMigration(
  moduleName: string,
  modulesDir: string = DEFAULT_MODULES_DIR,
  options: CreateDiffMigrationOptions = {},
): Promise<string | DiffMigrationResult>
```

Computes `migrationsDir = path.join(modulesDir, moduleName, "migrations")` for the snapshot check and chooses:

- `snapshotExist(migrationsDir)` is **false** → `createInitialMigration(moduleName, modulesDir, options)` (returns a file-path `string`).
- **true** → `createDiffMigration(moduleName, modulesDir, options)` (returns a `DiffMigrationResult`).

> The router checks the snapshot under `modulesDir/moduleName/migrations` but passes its `modulesDir` argument **unchanged** to the builders as their `moduleResolver` (the directory that gets `import()`ed for models). So `createMigration`'s second argument must already be the module's own directory (e.g. `src/modules/user`), not a modules-root like `src/modules` — pass the same value you would pass the builders. The in-repo callers (`@damatjs/orm-cli`, `@damatjs/module`) skip the router and call `createInitialMigration` / `createDiffMigration` directly with the module's resolver path.

## `createInitialMigration` — baseline

Source: [`initialMigration.ts`](../src/generator/initialMigration.ts)

```ts
export async function createInitialMigration(
  moduleName: string,
  moduleResolver: string,
  options: MigrationGeneratorOptions = {},
): Promise<string>
```

1. Verify `moduleResolver` exists (throws `Module '<name>' not found at <resolver>` otherwise).
2. Ensure `<moduleResolver>/migrations/` exists (`mkdir -p`).
3. `models = await discoverModels(moduleResolver)`.
4. `snapshot = toModuleSchema(moduleName, models)` and immediately `saveSnapshot(migrationsDir, snapshot)` — the first snapshot.
5. `migration = generateMigration.generateFromSnapshot(snapshot, options)` — full `CREATE` SQL.
6. Build the filename `Migration<timestamp>_Initial.sql` (`generateTimestamp(now)`), render with `getMigrationTemplateWithSQL`, and write it.
7. Log success, surface any `migration.warnings`, and return the absolute file path.

## `createDiffMigration` — incremental

Source: [`diffMigration.ts`](../src/generator/diffMigration.ts)

```ts
export async function createDiffMigration(
  moduleName: string,
  moduleResolver: string,
  options: CreateDiffMigrationOptions = {},
): Promise<DiffMigrationResult>
```

1. Verify `moduleResolver` exists; ensure `migrations/` exists.
2. `models = await discoverModels(moduleResolver)`.
3. `previous = loadSnapshot(migrationsDir, moduleName)` (empty baseline if no file).
4. `current = toModuleSchema(moduleName, models)`.
5. `diff = diffSchemas.diffSchemas(previous, current)`.
6. If `!diff.hasChanges && !options.force` → return early with `{ filePath: null, hasChanges: false, diff, migration: null, warnings: [] }` (no file, no snapshot rewrite).
7. `migration = generateMigration.generateFromDiff(diff, options)`.
8. Label = capitalized module name; filename `Migration<timestamp>_<Label>.sql`; render and write.
9. Unless `options.updateSnapshot === false`, `saveSnapshot(migrationsDir, current)` so the next diff is incremental.
10. Surface warnings; return the full `DiffMigrationResult`.

```ts
// from @damatjs/orm-processor
interface CreateDiffMigrationOptions extends MigrationGeneratorOptions {
  updateSnapshot?: boolean; // default true
  force?: boolean;          // write even with no changes
}
interface DiffMigrationResult {
  filePath: string | null;
  hasChanges: boolean;
  diff: SchemaDiff;
  migration: GeneratedMigration | null;
  warnings: string[];
}
```

## Templating & timestamps

Source: [`utils/template.ts`](../src/utils/template.ts), [`utils/timestamp.ts`](../src/utils/timestamp.ts)

### `getMigrationTemplateWithSQL(className, name, moduleName, timestamp, migration): string`

Renders the `.sql` file body:

- Each statement in `migration.upStatements` gets a trailing `;` appended **if it doesn't already end with one**, joined by blank lines. Empty statement lists become `-- No changes detected`.
- `migration.warnings` are rendered as `-- WARNING: ...` comment lines above the body.
- A header block records the label, module, ISO creation time, and `migration.description`, plus a "review before running in production" note.

### `generateTimestamp(date): string`

`YYYYMMDDHHMMSS` derived from `date.toISOString()` (strips `-:T` and the fractional/zone tail, takes the first 14 chars). This must stay aligned with the discovery regex `/Migration(\d+)/`.

## Edge cases & gotchas

- **Diff with no changes writes nothing** unless `force: true` — and a no-op result has `filePath: null`, so callers must null-check.
- **Snapshot is written eagerly for initial, conditionally for diff.** An initial migration saves the snapshot before the file even succeeds to write; a diff saves only after a successful write and only if `updateSnapshot !== false`.
- **Models must be discoverable.** `discoverModels` throws if the module exposes no `models`; both builders propagate that.
- **Generated SQL is `up`-only.** The template emits only forward statements; there is no `down` section.
- **Timestamp collisions.** Two migrations generated in the same second for the same module would produce the same filename; generate sequentially.

## Safe extension

- To embed reversible SQL, extend `GeneratedMigration` consumption in `getMigrationTemplateWithSQL` and have the processor provide `down` statements (e.g. via `reverseDiff`).
- To change file naming, update both `generateTimestamp`/the className builders **and** the discovery filter/regex together.
- Keep generation database-free; all "what changed" logic lives in the processor's diff layer.
