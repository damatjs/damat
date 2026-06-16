# Snapshot layer

Source: [`src/snapshot/index.ts`](../src/snapshot/index.ts)

## Responsibility

Persist and reload a module's schema as a single JSON file, `schema-snapshot.json`, inside the module's migrations directory. This is the **only** part of the processor that touches the filesystem. Everything else operates on in-memory `ModuleSchema` objects.

The snapshot answers "what did the schema look like the last time we generated a migration?" — the `previous` argument to `diffSchemas`. Because the previous state is read from disk rather than from a live database, migration generation works offline and reproducibly.

## File location & format

```
src/modules/<module>/migrations/schema-snapshot.json
```

The file is a `JSON.stringify(schema, null, 2)` dump of the full `ModuleSchema`:

```jsonc
{
  "moduleName": "store",
  "schema": "public",
  "tables": [
    {
      "name": "product",
      "columns": [
        { "name": "id", "type": "uuid", "nullable": false, "primaryKey": true },
        { "name": "title", "type": "character varying", "length": 200, "nullable": false }
      ],
      "indexes": [],
      "foreignKeys": []
    }
  ],
  "enums": [],
  "relationships": []
}
```

## Functions

### `loadSnapshot(migrationsDir, moduleName): ModuleSchema`

```ts
export function loadSnapshot(migrationsDir: string, moduleName: string): ModuleSchema
```

Reads `<migrationsDir>/schema-snapshot.json` and `JSON.parse`s it. If the file does **not** exist it returns an **empty baseline**, not an error:

```ts
{ moduleName, schema: "public", tables: [], enums: [], relationships: [] }
```

This baseline is what makes the first-ever diff produce a full "create everything" change set: diffing an empty `previous` against the real `current` yields `create_*` changes for every table and enum.

### `saveSnapshot(migrationsDir, schema): void`

```ts
export function saveSnapshot(migrationsDir: string, schema: ModuleSchema): void
```

Writes the pretty-printed schema to `<migrationsDir>/schema-snapshot.json`, creating `migrationsDir` recursively if it doesn't exist. Callers persist the **current** schema only after a migration has been successfully written, so a failed/aborted run leaves the previous snapshot intact.

### `snapshotExist(migrationsDir): boolean`

```ts
export function snapshotExist(migrationsDir: string): boolean
```

Cheap existence check. The migration package uses it to decide between an initial (baseline) migration and a diff migration — see `createMigration` in orm-migration.

## Step-by-step: typical lifecycle

1. `previous = loadSnapshot(dir, "store")` → empty baseline on first run.
2. Build `current` from live models (done in orm-model / orm-migration).
3. `diff = diffSchemas(previous, current)`.
4. Generate and write the `.sql` migration.
5. `saveSnapshot(dir, current)` → next run's `previous` is this `current`.

## Edge cases & gotchas

- **No schema validation on load.** `loadSnapshot` casts the parsed JSON straight to `ModuleSchema`. A hand-edited or corrupt snapshot can produce a malformed diff; treat the file as machine-generated.
- **Missing file is not an error.** Absence is interpreted as "empty schema", which is intentional for bootstrapping.
- **`migrationsDir` is the migrations folder, not the module root.** The snapshot lives alongside the `Migration*.sql` files.
- **Save is overwrite, not merge.** The file always reflects one complete schema state.

## Safe extension

- To support a different filename or per-environment snapshots, parameterize the `"schema-snapshot.json"` constant (it is duplicated in all three functions — keep them in sync).
- If you add validation, do it in `loadSnapshot` after `JSON.parse` and fail loudly; downstream layers assume a structurally valid `ModuleSchema`.
- Keep these functions the *only* I/O in the package; do not add database access here.
