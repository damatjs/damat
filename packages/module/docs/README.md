# @damatjs/module — Internals

Maintainer-facing documentation for the module system. For the public overview
and quick start, see the [package README](../README.md). For the `damat.json`
contract from a module author's point of view, see [MODULES.md](../MODULES.md).

## What this package is

The module system, gathered into one package, organized by concern:

- **Authoring** — the single import surface a module package uses.
- **Manifest** — the universal `damat.json` contract that makes a module portable.
- **Config** — `module.config.ts`, the only thing a module author configures.
- **Harness** — boot a module standalone for dev/test (no server).
- **Runtime** — run one module package as a live HTTP app.
- **Tooling** — migrations + codegen for a standalone module package.
- **Registry** — refs, readiness, resolution, and the verification/trust gate.

Everything is re-exported from `src/index.ts` via the concern barrels.

## Module map

| Path               | Responsibility                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/index.ts`     | Root barrel: re-exports every concern (`authoring`, `manifest`, `config`, `runtime`, `harness`, `tooling`, `registry`).                                                        |
| `src/authoring.ts` | The authoring surface — re-exports `defineModule`/`ModuleService`/`model`/`columns`/workflow engine/route types/`z` from sibling packages. See [authoring.md](./authoring.md). |
| `src/manifest/`    | Universal `damat.json` normalization plus legacy manifest compatibility. See [manifest.md](./manifest.md).                                                                   |
| `src/config/`      | `module.config.ts`: `defineModuleConfig`, `loadModuleConfig`, `ModuleAppConfig`. See [config.md](./config.md).                                                                 |
| `src/harness/`     | Standalone dev/test: `bootModule`, `withModule`, db resolution, migration apply. See [harness.md](./harness.md).                                                               |
| `src/runtime/`     | Module-as-app: `startModuleApp`, `runModuleEntry`, app-config build, module-dir location. See [runtime.md](./runtime.md).                                                      |
| `src/tooling/`     | `createModuleMigration`, `generateModuleTypes` — no `damat.config.ts` needed. See [tooling.md](./tooling.md).                                                                  |
| `src/registry/`    | Refs, readiness, resolution, verification. See [registry.md](./registry.md).                                                                                                   |

### Per-concern file map

| File                              | Role                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| `manifest/types/`                 | `ModuleManifest` & friends, `DEFAULT_MODULE_PATHS`.                                          |
| `manifest/validate.ts`            | `validateModuleManifest` (throws CLI-friendly errors).                                       |
| `manifest/read.ts`                | Prefer `damat.json`, normalize it, then fall back to legacy `module.json`.                    |
| `manifest/damat.ts`               | Normalize universal module metadata into `ModuleManifest`.                                  |
| `manifest/constants.ts`           | Legacy manifest filename retained for compatibility reads.                                  |
| `config/types.ts`                 | `ModuleAppConfig`.                                                                           |
| `config/define.ts`                | `defineModuleConfig` (identity helper).                                                      |
| `config/load.ts`                  | `loadModuleConfig` (dynamic import of the config file).                                      |
| `harness/boot.ts`                 | `bootModule` — wire infra, migrate, init, return `BootedModule`.                             |
| `harness/with.ts`                 | `withModule` — boot + run + always teardown.                                                 |
| `harness/database.ts`             | `resolveDatabaseConfig` (internal — not exported from the barrel).                           |
| `harness/migrate.ts`              | `applyModuleMigrations` (internal — used by harness & runtime).                              |
| `harness/types.ts`                | `BootableModule`, `BootModuleOptions`, `BootedModule`.                                       |
| `runtime/start.ts`                | `startModuleApp` — full HTTP stack for one module.                                           |
| `runtime/entry.ts`                | `runModuleEntry` — `damat module dev` entry.                                                 |
| `runtime/appConfig.ts`            | `buildModuleAppConfig`, `DEFAULT_MODULE_PORT`.                                               |
| `runtime/locate.ts`               | `locateModuleDir` — find either manifest at package root or in `src/`.                       |
| `runtime/types.ts`                | `StartModuleAppOptions`, `RunningModuleApp`.                                                 |
| `tooling/migration.ts`            | `createModuleMigration`.                                                                     |
| `tooling/codegen.ts`              | `generateModuleTypes`.                                                                       |
| `registry/types.ts`               | `ModuleRef`, `ModuleValidationReport`.                                                       |
| `registry/parse.ts` / `format.ts` | `parseModuleRef` / `formatModuleRef`.                                                        |
| `registry/entry.ts`               | `RegistryIndex`/`RegistryModuleEntry` schema + verification types + `normalizeVersionEntry`. |
| `registry/verify.ts`              | `verificationPolicy`, `evaluateVerification` — the trust gate.                               |
| `registry/readiness.ts`           | `validateModuleDir` — registry-readiness report.                                             |
| `registry/resolve.ts`             | `resolveRegistryEntry`, `resolveRegistryRef`, `ResolvedRegistryModule`.                      |

## Split docs

- [authoring.md](./authoring.md) — the single-import authoring surface.
- [manifest.md](./manifest.md) — universal and legacy manifest behavior.
- [config.md](./config.md) — `module.config.ts` and `ModuleAppConfig`.
- [harness.md](./harness.md) — `bootModule` / `withModule`, dev + test.
- [runtime.md](./runtime.md) — `startModuleApp` / `runModuleEntry`, module-as-app.
- [tooling.md](./tooling.md) — migrations + codegen.
- [registry.md](./registry.md) — refs, resolution, the trust model, the index schema.

## Architecture overview

A module package has a root `damat.json` and an `index.ts` that default-exports
`defineModule(...)`. The standard layout is:

```
my-module/
├── package.json          (depends on @damatjs/module only)
├── damat.json            (portable install + module contract)
├── module.config.ts      (optional author overrides)
└── src/
    ├── index.ts          (default-exports defineModule(...))
    ├── models/           (ORM model definitions)
    ├── migrations/       (SQL migrations the module owns)
    ├── workflows/        (workflow definitions)
    ├── types/            (generated row types + zod)
    └── api/routes/       (file-based HTTP routes)
```

The same directory is consumed three ways:

1. **Standalone (harness)** — `bootModule` wires `ConnectionManager` +
   `PoolManager`, applies the module's own migrations, calls `module.init()`,
   and hands back `service` for direct calls. No HTTP.
2. **Live app (runtime)** — `startModuleApp` builds a full framework `AppConfig`
   from `damat.json` + `module.config.ts`, runs `initializeServices`, applies
   migrations, `bootstrap`s the Hono app over `api/routes`, and serves.
3. **Distribution (registry)** — `validateModuleDir` checks the contract,
   `parseModuleRef`/`resolveRegistryEntry` address it, and `evaluateVerification`
   gates installs. (The hosted backend isn't live yet; the contract is fixed.)

## Control & data flow

```
authoring  ─ defineModule(...) ──────────────► a module package (src/ + damat.json)
                                                       │
manifest   ─ readModuleManifest ─► ModuleManifest ◄────┤ (read by harness/runtime/registry)
                                                       │
config     ─ loadModuleConfig ──► ModuleAppConfig ─────┤ (read by runtime)
                                                       │
harness    ─ bootModule ─► ConnectionManager+PoolManager → applyModuleMigrations → init → service
                                                       │
runtime    ─ startModuleApp ─► buildModuleAppConfig → initializeServices → applyModuleMigrations
                                → bootstrap(api/routes) → serve
                                                       │
tooling    ─ createModuleMigration / generateModuleTypes (locateModuleDir + readModuleManifest)
                                                       │
registry   ─ parseModuleRef → resolveRegistryEntry(DAMAT_MODULE_REGISTRY)
                            → evaluateVerification(DAMAT_MODULE_VERIFY)
```

## Invariants & design decisions

- **One dependency for authors.** A module package's only direct dep is
  `@damatjs/module`; `authoring.ts` re-exports everything else, so module code is
  insulated from sibling-package versions.
- **The manifest is the contract.** Root `damat.json` is the source of truth for
  identity, install modes, capabilities, dependencies, module layout, and
  registry metadata. Legacy `module.json` is read during the 0.x migration only.
- **kebab-case module names.** `validateModuleManifest` enforces
  `/^[a-z][a-z0-9-]*$/`; the same pattern bounds the namespace/name in refs.
- **Standard layout via `DEFAULT_MODULE_PATHS`.** Omit `paths` and the standard
  `index.ts` / `models` / `migrations` / `workflows` / `types` apply.
- **Module dir may be root or `src/`.** `locateModuleDir` recognizes either
  manifest filename in both locations.
- **Errors vs warnings** (`validateModuleDir`): errors block _install_
  (missing entry, broken manifest, declared-but-missing dirs); warnings block
  _publishing_ (missing version/description/author/license/namespace; models
  without migrations).
- **Two planes of trust** (registry): the author _declares_
  name/version/author/license/keywords/repository in `damat.json`; the registry
  _backend_ assigns `owner` and stamps `verification`. An author cannot
  self-verify. `rejected`/`revoked` is always blocked regardless of policy.
- **The harness owns the process.** `bootModule` calls `PoolManager.reset()`
  before `setup` and on `teardown` — it assumes a single module per process.
- **`applyModuleMigrations` / `resolveDatabaseConfig` are internal.** They live
  under `harness/` but are _not_ re-exported from `harness/index.ts`; the runtime
  imports `applyModuleMigrations` directly.

## Safe-extension guidance

- **New manifest field**: add it to `ModuleManifest` in `manifest/types.ts`,
  validate shape in `manifest/validate.ts` (throw CLI-readable messages), and, if
  it's registry-relevant, add a readiness check in `registry/readiness.ts` and
  mirror it on `RegistryModuleEntry`. Keep `validateModuleManifest`
  backward-compatible — extra unknown keys are allowed.
- **New registry field**: add it to `entry.ts`; remember the index is
  forward-compatible (a bare `{ source }` or string source must keep resolving).
- **New runtime knob**: thread it through `StartModuleAppOptions` →
  `buildModuleAppConfig`; defaults must cover the unset case.
- **New harness option**: add to `BootModuleOptions`; keep `bootModule` working
  with zero options except where a database is genuinely required.
