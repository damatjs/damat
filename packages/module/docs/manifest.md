# The `module.json` contract

Source: `src/manifest/types.ts`, `src/manifest/validate.ts`,
`src/manifest/read.ts`, `src/manifest/constants.ts`.

`module.json` is what makes a module **portable**. It sits next to the module's
`index.ts` and is read by `damat module add <source>` to copy the module into an
app, register it in `damat.config.ts`, surface required env vars, and install npm
packages. The future module registry indexes modules by the same manifest.

> Author-facing field reference also lives in [MODULES.md](../../../MODULES.md). This
> page documents the _types and validation_ as implemented.

## Filename

```ts
// src/manifest/constants.ts
MODULE_MANIFEST_FILENAME = "module.json";
```

## `ModuleManifest`

```ts
interface ModuleManifest {
  name: string; // module id — registry key + default dir name; kebab-case
  version?: string;
  description?: string;
  author?: ModuleAuthor | string; // string or { name, email?, url? }
  env?: ModuleEnvVar[]; // env vars the credentials loader reads
  packages?: Record<string, string>; // npm deps the host app must install: name -> semver range
  modules?: string[]; // other damat modules this depends on (registry ids)
  paths?: ModuleManifestPaths; // layout overrides (omit for standard layout)
  registry?: ModuleRegistryMeta; // registry publishing metadata
}
```

### `ModuleEnvVar`

```ts
interface ModuleEnvVar {
  name: string; // e.g. "BETTER_AUTH_SECRET"
  required?: boolean; // module fails to start without it (default: true, by convention)
  description?: string; // shown when missing
  example?: string; // written to .env.example
}
```

### `ModuleAuthor`

```ts
interface ModuleAuthor {
  name: string;
  email?: string;
  url?: string;
}
```

May also be a single string (`"Name <email> (url)"`). This is the _declared_
author — provenance/display only, **not** the verifiable owner (the registry
backend assigns that; see [registry.md](./registry.md)).

### `ModuleManifestPaths` + `DEFAULT_MODULE_PATHS`

```ts
interface ModuleManifestPaths {
  entry?: string; // default "./index.ts" — must default-export defineModule(...)
  models?: string; // default "./models"
  migrations?: string; // default "./migrations"
  workflows?: string; // default "./workflows"
  types?: string; // default "./types"
}

const DEFAULT_MODULE_PATHS: Required<ModuleManifestPaths> = {
  entry: "./index.ts",
  models: "./models",
  migrations: "./migrations",
  workflows: "./workflows",
  types: "./types",
};
```

Omit `paths` entirely (or any subset) to use the standard layout. Consumers merge
`{ ...DEFAULT_MODULE_PATHS, ...manifest.paths }`.

### `ModuleRegistryMeta`

```ts
interface ModuleRegistryMeta {
  namespace?: string; // publisher/org, e.g. "damatjs"
  keywords?: string[]; // search keywords
  license?: string; // SPDX id, e.g. "MIT"
  repository?: string; // source repo URL
  homepage?: string; // docs/homepage URL
}
```

Optional today; `validateModuleDir` warns when registry-relevant fields are
missing so a module can be made registry-ready ahead of the backend shipping.

## `validateModuleManifest(raw): ModuleManifest`

Hand-rolled validation that throws `Error`s with CLI-friendly messages. It does
**not** strip unknown keys — the cast at the end keeps the manifest
forward-compatible. Checks (in order):

1. `raw` must be a non-null object → else `"module.json must contain a JSON object"`.
2. `name` must be a non-empty string → `'module.json requires a "name" field'`.
3. `name` must match `/^[a-z][a-z0-9-]*$/` → else `"… must be kebab-case …"`.
4. `author`, if present, must be a string or an object with a string `name`.
5. `env`, if present, must be an array; each entry an object with a string `name`.
6. `packages`, if present, must be a plain object (not array/null).
7. `modules`, if present, must be an array.
8. `registry`, if present, must be an object.

Anything else passes through untouched. (Tests in `tests/manifest.test.ts` cover
minimal, full, author shapes, bad names, and malformed env/packages/registry.)

## `readModuleManifest(moduleDir): ModuleManifest`

```ts
function readModuleManifest(moduleDir: string): ModuleManifest;
```

1. Build `join(moduleDir, "module.json")`.
2. If missing → throw `"No module.json found in <dir> — not a damat module"`.
3. `JSON.parse(readFileSync(...))`; parse errors are re-thrown with the path.
4. Return `validateModuleManifest(parsed)`.

## Gotchas

- `name` is the registry key, the default install directory name, **and** the
  migration namespace. It must be globally meaningful, not just locally unique.
- `required` on env vars defaults to `true` _by convention_ (consumers decide) —
  validation doesn't enforce a value, it only checks shape.
- `packages` is name → semver **range** (a string), not name → boolean.
- `modules` are _registry ids_ (other damat modules), distinct from `packages`
  (npm deps).
- Validation is permissive about unknown keys on purpose; don't rely on it to
  reject typos in optional fields — `validateModuleDir` is the readiness check.
