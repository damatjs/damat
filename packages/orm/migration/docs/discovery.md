# Discovery

Source: [`src/discovery/`](../src/discovery)

## Responsibility

Find what exists on disk and in code: the migration `.sql` files a module declares, and the model definitions a module exports. Discovery is read-only and (for files) does no database work — it produces `MigrationInfo` records that the executor and status layers later cross-reference against the tracker.

## `MigrationInfo`

```ts
// src/types/migration.ts
interface MigrationInfo {
  name: string; // filename without ".sql", e.g. "Migration20260316103000_Initial"
  resolver: string; // the module resolver this file was found under
  path: string; // absolute path to the .sql file
  timestamp: number; // 14-digit timestamp parsed from the filename
  applied: boolean; // false at discovery; set true by status after consulting the tracker
}
```

## File discovery

### `discoverModuleMigrations(moduleResolver): MigrationInfo[]`

Source: [`moduleMigrations.ts`](../src/discovery/moduleMigrations.ts)

```ts
export function discoverModuleMigrations(
  moduleResolver: string | Pick<OrmModule, "resolve" | "migrations">,
): MigrationInfo[];
```

1. Looks in `path.join(moduleResolver, "migrations")`. If the directory doesn't exist, returns `[]`.
2. Reads the directory and keeps only files that **start with `Migration` and end with `.sql`**.
3. `.sort()`s lexicographically — which, because the timestamp is fixed-width and immediately follows `Migration`, equals chronological order.
4. Maps each file to a `MigrationInfo`, parsing the timestamp with `/Migration(\d+)/` (defaulting to `0` if it doesn't match), resolving the path absolutely, and setting `applied: false`.

Resolved descriptors use their explicit `migrations` directory; string callers
keep the conventional `<resolver>/migrations` behavior.

### `discoverAllMigrations(modulesResolver[]): MigrationInfo[]`

Source: [`allMigrations.ts`](../src/discovery/allMigrations.ts)

```ts
export function discoverAllMigrations(
  modulesResolver: Array<string | Pick<OrmModule, "resolve" | "migrations">>,
): MigrationInfo[];
```

Calls `discoverModuleMigrations` for each resolver, concatenates the results, and sorts the combined list by `timestamp` ascending (oldest first) — giving a global chronological order across modules.

## Model discovery

### `discoverModels(moduleResolver, logger?): Promise<ModelDefinition[]>`

Source: [`models.ts`](../src/discovery/models.ts)

```ts
export async function discoverModels(
  moduleResolver: string,
  logger?: ILogger,
): Promise<ModelDefinition[]>;
```

1. A file or indexed directory may expose an aggregate named `models` map.
2. A directory without an index is scanned for `.ts`/`.js` files, collecting
   exported model definitions.
3. If empty, logs an error when a logger is passed and throws.
4. Otherwise logs the count and returns the models.

Used by the generator to build the current `ModuleSchema` via `toModuleSchema`.

## Edge cases & gotchas

- **Strict filename contract.** Only `Migration*.sql` files are seen. A file missing the prefix, using a different extension, or with a non-numeric timestamp segment is either ignored or gets `timestamp: 0` (sorting last among prefixed files, but `.sort()` already ordered by name).
- **Absolute paths.** `MigrationInfo.path` is `path.resolve`d, so the executor can read it regardless of CWD; the parent `migrationsDir` is joined relative to the resolver.
- **`applied` is always `false` from discovery.** It is only meaningful after `status.ts` consults the tracker (the executor uses its own applied-name `Set` instead of mutating this flag).
- **Aggregate and file-per-model layouts work.** Existing named `models` maps
  remain supported; declared model directories can contain one exported model
  per file.
- **Dynamic import side effects.** Model provider files execute during import;
  keep them free of runtime/database startup work.

## Safe extension

- To support nested or differently-named migration folders, change the `path.join(..., "migrations")` and the filter predicate in `moduleMigrations.ts`; keep the timestamp regex aligned with `generateTimestamp` in `utils/timestamp.ts`.
- If you add metadata to `MigrationInfo`, populate it here and keep `status.ts`/`executor` consumers in sync.
- Discovery should stay pure (fs + dynamic import only); cross-referencing with the database belongs in the status/executor layers.
