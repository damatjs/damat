# Config loading & path resolution

How `damat-orm` turns a `damat.config.ts` and a module id into concrete model,
migration, and types directories. Sources: `src/cli/utils/load.ts`,
`src/cli/config/index.ts`, `src/cli/utils/paths/*`.

## `loadModules(configPath, cwd?)` — `src/cli/utils/load.ts`

```ts
async function loadModules<T = Record<string, { resolve: string }>>(
  configPath: string,
  cwd: string = process.cwd(),
): Promise<T>
```

Loads the `modules` map from a config file and normalizes it.

Steps:

1. Resolve `filePath`: absolute `configPath` is used as-is; otherwise
   `path.join(cwd, configPath)`. Throws `Config file not found: <path>` if it
   does not exist.
2. `configDir = dirname(filePath)` — the base for relative module `resolve`
   paths.
3. Import with cache busting via `loadConfigModule`: copy the config to a
   transient sidecar file (`.damat-config-<pid>-<n><ext>` next to it) so every
   load gets a distinct module identity, `import("file://" + sidecar)`, then
   delete the sidecar in `finally`. `config = mod.default ?? mod`.
4. For each key in `config.modules`:
   - `id = module.id ?? moduleName` (falls back to the object key).
   - `resolvedPath = isAbsolute(module.resolve) ? module.resolve :
     path.resolve(configDir, module.resolve)`.
   - Store `modules[id] = { id, resolve: resolvedPath, path: module.resolve,
     name: moduleName }`.
5. For each link migration module from
   `resolveLinkMigrationModules(config.links, configDir)` (one `link:<owner>` per
   `src/links/<owner>` directory): store
   `modules[entry.id] = { id, resolve, path, name: id, kind: "link" }`, skipping
   any id that already names a real module (real modules are never clobbered).
6. Return the `OrmModuleContainer` (keyed by `id`).

Errors that start with `Config file not found` are re-thrown untouched; any other
failure is wrapped as `Failed to load config from '<path>': <message>`.

> Return-shape note: the generic default and `src/cli/types.ts`'s `ModulesMap`
> suggest `{ resolve }` only, but the function builds the full
> `OrmModuleContainer` entry (`{ id, name, path, resolve }`). Commands rely on
> the richer shape. See the mismatch note in the [internals index](./README.md).

## `loadDatabaseUrl(configPath, cwd?)` — `src/cli/utils/load.ts`

```ts
interface DatabaseConfig { databaseUrl: string }
async function loadDatabaseUrl(configPath, cwd?): Promise<DatabaseConfig>
```

Resolution order:

1. `config.projectConfig.databaseUrl` → use directly.
2. else `config.services.database`:
   - `.connectionString` → use directly.
   - else if `.host || .database` → build a URL via `buildConnectionString`.
3. else → `{ databaseUrl: "" }` (callers treat empty as "not set" and error).

`buildConnectionString` defaults `host=localhost`, `port=5432`, `user=postgres`,
`password=""`, `database=postgres`; URL-encodes password and database; appends
`?ssl=true` (boolean) or `?ssl=<encoded JSON>` (object) when `ssl` is set. Same
cache-busting import + error-wrapping as `loadModules`.

## `requireDatabaseUrl(logger)` — `src/cli/config/index.ts`

```ts
function requireDatabaseUrl(logger: ILogger): string
```

Reads `process.env.DATABASE_URL`. If missing, prints a helpful hint
(`.env` with `DATABASE_URL=postgresql://…`) and `process.exit(1)`. Exported from
the package root for programmatic use.

> Note the two paths to a DB URL: `migrate:*` commands use `loadDatabaseUrl`
> (config-derived), while `requireDatabaseUrl` is the env-var-based helper
> exported for embedders. The bundled commands use the former.

## Path helpers — `src/cli/utils/paths/`

All resolvers take an absolute `moduleResolver` (a module's `resolve` path) and
join a conventional subfolder.

| Function | Returns | File |
|---|---|---|
| `resolveModelsPath(resolver)` | `<resolver>/models` | `paths/models.ts` |
| `resolveMigrationsPath(resolver)` | `<resolver>/migrations` | `paths/migrations.ts` |
| `resolveTypesPath(resolver)` | `<resolver>/types` | `paths/types.ts` |
| `resolvePaths(resolver)` | `{ modulesDir, modelsDir, migrationsDir, typesDir }` | `paths/index.ts` |
| `resolveBasePath(cliPath, configPath, defaultPath, cwd)` | first defined of cli/config/default, made absolute against `cwd` | `paths/base.ts` |
| `getModulesDir(configModulesDir, cwd)` | configured modules dir or `<cwd>/src/modules` | `paths/base.ts` |
| `DEFAULT_MODULES_DIR` | `"src/modules"` | `paths/base.ts` |

Layout convention enforced by these helpers:

```
<module.resolve>/
├── models/        ← model definitions (input to generate:types & migrate:create)
├── migrations/    ← .sql migrations + snapshot
└── types/         ← generated types (output of generate:types)
```

`resolveBasePath`/`getModulesDir` support a CLI-arg → config → default
precedence, but the bundled commands currently resolve everything from the
absolute `module.resolve` returned by `loadModules` (paths inside a module are
fixed relative to that root). `getModulesDir` carries a `//REMOVE THIS TODO`
marker — treat it as a legacy helper, not the primary path.

## Example `damat.config.ts`

```ts
export default {
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // or omit and use services.database below
  },
  // services: { database: { connectionString: "postgres://…" } },
  // services: { database: { host: "localhost", database: "app", user: "postgres" } },
  modules: {
    user: { id: "user", resolve: "./src/modules/user" },
    billing: { resolve: "./src/modules/billing" }, // id defaults to "billing"
  },
  links: "./src/links", // optional; each src/links/<owner> → link:<owner>
};
```

Given this, `migrate:create user` resolves models from
`<configDir>/src/modules/user/models`, writes the migration under
`…/user/migrations`, and `generate:types user` writes to `…/user/types`. A
`src/links/user/` directory is registered as `link:user`, so
`migrate:create link:user` writes its junction-table migration under
`…/links/user/migrations`.

## Gotchas

- **Config name is fixed** to `damat.config.ts` everywhere (handlers and the
  `bin.ts` config loader). There is no `--config` flag.
- **Relative `resolve` is relative to the config file**, not to `cwd` — important
  when running the CLI from a subdirectory.
- **Empty `databaseUrl` is silent**: `loadDatabaseUrl` returns `""` rather than
  throwing; each db command treats falsy as an error and exits 1.
- **Cache busting** means the config is re-read on every command invocation; a
  long-lived process calling these helpers repeatedly will pick up edits. It
  works by importing a transient sidecar copy of the config and deleting it
  afterwards, so the config's own module identity never gets cached across loads.
- **`config.links` is optional**: when absent (or pointing at a directory with no
  qualifying `<owner>` subdirectories) `loadModules` returns only the real
  modules. Otherwise each `src/links/<owner>` is added as a `link:<owner>` entry
  tagged `kind: "link"`.
