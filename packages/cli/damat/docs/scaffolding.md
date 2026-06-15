# Module scaffolding templates

`damat module init <name>` emits a complete, runnable module package from the
template functions in `src/command/module/scaffold/templates.ts`. The author
only fills in models, service logic, and `module.config.ts` — everything else
(server wiring, db, migrations, tests) is provided by the module runtime
(`@damatjs/module`).

## Naming helpers

| Function | Behaviour |
|---|---|
| `toCamel(name)` | `user-management` → `userManagement` |
| `toPascal(name)` | `user-management` → `UserManagement` |

`init` derives `serviceClass = ${toPascal(name)}Service` and the accessor name
`${toCamel(name)}Service()`.

## Generated layout

`init` creates these directories first:
`src/models`, `src/migrations`, `src/workflows`, `src/api/routes`,
`src/config/schema`, `tests`. Then it writes the file map below (each parent dir
is `mkdir -p`'d).

| File | Template fn | Purpose |
|---|---|---|
| `package.json` | `packageJsonTemplate(name)` | `@modules/<name>`, private, scripts wired to `damat module …` |
| `tsconfig.json` | `tsconfigTemplate()` | strict ESNext/bundler, `noEmit`, includes src/tests/module.config |
| `module.config.ts` | `moduleConfigTemplate()` | `defineModuleConfig({ projectConfig: { … } })` |
| `.env.example` | `envExampleTemplate()` | `DATABASE_URL=postgres://localhost:5432/postgres` |
| `.gitignore` | `gitignoreTemplate()` | `node_modules`, `.damat`, `.env`, `*.tsbuildinfo` |
| `src/module.json` | `manifestTemplate(name)` | the module manifest (name/version/registry/env/modules/paths) |
| `src/index.ts` | `entryTemplate(name, serviceClass)` | `defineModule(MODULE_ID, { service, credentials })` + `ModuleRegistry` augmentation |
| `src/service.ts` | `serviceTemplate(serviceClass)` | `class … extends ModuleService({ models, credentialsSchema })` |
| `src/accessor.ts` | `accessorTemplate(name, serviceClass)` | typed `getModule(name)` accessor |
| `src/config/schema/index.ts` | `configSchemaTemplate()` | `z.object({})` credentials schema |
| `src/config/load.ts` | `configLoadTemplate()` | `load(env)` credential loader |
| `src/config/index.ts` | `configIndexTemplate()` | default-exports `{ schema, load }` |
| `tests/contract.test.ts` | `contractTestTemplate(name)` | asserts `validateModuleDir(../src)` passes |

## What the key templates wire up

### `package.json` (`packageJsonTemplate`)

```jsonc
{
  "name": "@modules/<name>",
  "private": true,
  "scripts": {
    "dev": "damat module dev",
    "migration:create": "damat module migration:create",
    "codegen": "damat module codegen",
    "validate": "damat module validate",
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": { "@damatjs/module": "latest" },
  "devDependencies": { "@damatjs/damat-cli": "latest", "@types/bun": "latest", "typescript": "^5.7.2" }
}
```

The scripts are the bridge back to this CLI — a scaffolded module is driven via
`bun run dev` / `migration:create` / `codegen` / `validate`.

### `src/index.ts` (`entryTemplate`)

Default-exports `defineModule(MODULE_ID, { service, credentials: credentials.load })`,
re-exports the service + models, and augments the `@damatjs/services`
`ModuleRegistry` interface so the module id maps to its service type:

```ts
declare module "@damatjs/services" {
  interface ModuleRegistry { "<name>": <Name>Service; }
}
```

### `src/service.ts` (`serviceTemplate`)

```ts
import { ModuleService } from "@damatjs/module";
import { schema } from "./config/schema";

export const models = { /* columns.id()-based models */ };

export class <Name>Service extends ModuleService({
  models,
  credentialsSchema: schema,
}) {}
```

### `src/module.json` (`manifestTemplate`)

A `ModuleManifest` skeleton: `name`, `version: "0.0.1"`, `description`,
`registry: { namespace, license: "MIT", keywords }`, empty `env`/`modules`, and
the standard `paths` block (entry/models/migrations/workflows/types). This is the
file `damat module add` reads when the module is later installed into an app.

### `tests/contract.test.ts` (`contractTestTemplate`)

A `bun:test` that runs `validateModuleDir(join(import.meta.dir, "../src"))` and
asserts no errors and `valid === true` — i.e. the scaffold is born passing
`damat module validate`.

## Gotchas

- **`module.config.ts` vs `src/module.json`** are different files: the former is
  the runtime app config (`defineModuleConfig`), the latter is the portable
  manifest the registry/installer reads. `init` writes both.
- **`@damatjs/module` and `@damatjs/damat-cli` are pinned to `latest`** in the
  template, not to the workspace `*`; a scaffolded package resolves them from the
  registry, not the monorepo.
- **The scaffold is intentionally minimal but complete**: empty `models`, empty
  credentials schema, `load` returning `{}`. It runs and validates immediately;
  the author fills in the gaps.
- **Adding a scaffold file** = add a `xxxTemplate()` to `templates.ts`, then add
  it to the `files` map (and any needed `mkdirSync`) in `init.ts`. Keep templates
  as plain string-returning functions so `init` stays a simple write loop.
