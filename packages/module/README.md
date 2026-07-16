# @damatjs/module

> The Damat module system in one package: authoring surface, the portable `damat.json` contract, a standalone dev/test harness, module-as-app runtime, and registry tooling.

A Damat _module_ is a self-contained vertical slice — models + migrations +
service + config + workflows + routes. This package is the heart of Damat's
composability: it lets you **author, run, and test a module on its own** (no
backend app), ship it with a `damat.json` manifest, and install it into any
Damat app with `damat module add` (and, later, straight from a module registry).
It is the single dependency a module package needs — it re-exports everything
from defining a module to running it as a live HTTP app.

Part of the [Damat](../../README.md) monorepo · [Full guide](../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

```bash
bun add @damatjs/module
```

Inside the Damat monorepo it is a workspace package — depend on it with the `*` version range:

```json
{ "dependencies": { "@damatjs/module": "*" } }
```

## When to use

Use it when:

- You are **authoring a module package** — import the contract/config/runtime/tooling from here; the authoring symbols come from their real packages (`defineModule`/`ModuleService` from `@damatjs/services`, `model`/`columns` from `@damatjs/orm-model`, `createStep`/… from `@damatjs/workflow-engine`, `z` from `@damatjs/deps/zod`).
- You are **relating modules to each other** — `defineLink` / `collectLinkModels` / `defineLinkModule` are re-exported here so the app's `src/links/` can declare cross-module relationships from the same surface (the runtime service is `getModule("link")`). See [`@damatjs/link`](../link/README.md).
- You want to **develop or test a module standalone** against a real Postgres, without spinning up a backend (`bootModule` / `withModule`).
- You want to **run one module as a live app** — full framework HTTP stack, just this module registered (`startModuleApp`, what `damat module dev` boots).
- You build **tooling**: generate a module's types, create a diff migration, or apply/inspect a module's own migrations against `DATABASE_URL` — all with no `damat.config.ts` (`generateModuleTypes`, `createModuleMigration`, `runModuleMigration`, `runModuleMigrationStatus`).
- You implement **module distribution**: parse/format module refs, read and validate `damat.json` with legacy `module.json` fallback, check registry-readiness, and resolve verified registry entries.

Skip it when:

- You're building app-level wiring that isn't a module — use `@damatjs/framework` directly.
- You only need workflows — depend on `@damatjs/workflow-engine` directly.

## Quick start

Author a module (import each symbol from its real package):

```ts
// src/index.ts
import { defineModule, ModuleService } from "@damatjs/services";
import { model, columns } from "@damatjs/orm-model";
import { loadCredentials } from "./credentials";

const models = { users: model("users", { id: columns.uuid().primaryKey() }) };

export class UserModuleService extends ModuleService({ models }) {}

export default defineModule("user", {
  service: UserModuleService,
  credentials: loadCredentials,
});
```

Develop & test it standalone (real Postgres, no server):

```ts
import { bootModule, withModule } from "@damatjs/module";
import userModule from "./index";

// playground / scripts
const booted = await bootModule(userModule, { moduleDir: import.meta.dir });
const user = await booted.service.user.create({ data: { email: "a@b.co" } });
await booted.teardown();

// tests — boot, run, always tear down
await withModule(
  userModule,
  { moduleDir: import.meta.dir },
  async ({ service }) => {
    expect(await service.user.exists({ where: { email: "a@b.co" } })).toBe(
      true,
    );
  },
);
```

Run it as a live app, or address it for a registry:

```ts
import {
  startModuleApp,
  parseModuleRef,
  validateModuleDir,
} from "@damatjs/module";

const app = await startModuleApp({ port: 0 }); // full HTTP stack, this module only
await app.stop();

parseModuleRef("damatjs/user@0.2.0"); // → { namespace: "damatjs", name: "user", version: "0.2.0" }
validateModuleDir("./src"); // → { valid, errors, warnings, manifest }
```

Requires Postgres (`DATABASE_URL`, or `{ databaseUrl }` / `{ database }`) for the
harness and for the runtime when serving. In test suites gate DB tests with
`describe.skipIf(!process.env.DATABASE_URL)`.

## API

| Export                                                                                                    | Kind           | Summary                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defineModule`, `ModuleService`                                                                           | re-export      | Define a module and its service base (from `@damatjs/services`).                                                                                         |
| `model`, `columns`                                                                                        | re-export      | ORM model DSL (from `@damatjs/orm-model`).                                                                                                               |
| `createStep`, `createWorkflow`, `executeStep`, `parallel`, `when`, `ifElse`, `RetryPolicies`, `Effect`, … | re-export      | Workflow engine (from `@damatjs/workflow-engine`).                                                                                                       |
| `getModule`, `hasModule`, `registerModule`                                                                | re-export      | App-side registry access (from `@damatjs/framework`).                                                                                                    |
| `defineLink`, `collectLinkModels`, `defineLinkModule`                                                     | re-export      | Cross-module [links](../link/README.md): relate this module to another through a junction table; `getModule("link")` exposes create/dismiss/fetch/graph. |
| `z`                                                                                                       | re-export      | Zod validation.                                                                                                                                          |
| `defineModuleConfig`                                                                                      | function       | Type-safe helper for `module.config.ts`.                                                                                                                 |
| `loadModuleConfig`                                                                                        | function       | Load a package's `module.config.ts` (empty config if absent).                                                                                            |
| `readModuleManifest`, `validateModuleManifest`, `resolveModuleEntry`                                      | function       | Read and validate module manifests, then resolve a declared or conventional runtime entry.                                                               |
| `resolveModuleArtifact`, `resolveArtifactRoot`, `ResolvedModule`                                          | function/types | Resolve source, Node package, or Damat package locations into one absolute runtime surface.                                                              |
| `bootModule`, `withModule`                                                                                | function       | Boot a module standalone (with migrations) for dev/test; auto-teardown variant.                                                                          |
| `startModuleApp`, `runModuleEntry`                                                                        | function       | Run one module as a live HTTP app; `damat module dev` entry.                                                                                             |
| `createModuleMigration`, `generateModuleTypes`                                                            | function       | Diff-migration & codegen for a standalone module package.                                                                                                |
| `runModuleMigration`, `runModuleMigrationStatus`                                                          | function       | Apply / report a standalone module's own migrations against `DATABASE_URL`.                                                                              |
| `parseModuleRef`, `formatModuleRef`                                                                       | function       | Parse / format refs like `damatjs/user@0.2.0`.                                                                                                           |
| `validateModuleDir`                                                                                       | function       | Registry-readiness report (errors block install, warnings block publish).                                                                                |
| `resolveRegistryEntry`, `resolveRegistryRef`                                                              | function       | Resolve a ref against a registry index → source + owner + verification.                                                                                  |
| `evaluateVerification`, `verificationPolicy`                                                              | function       | Install-time trust gate (`DAMAT_MODULE_VERIFY` / `DAMAT_MODULE_REGISTRY`).                                                                               |
| `normalizeVersionEntry`                                                                                   | function       | Coerce a registry version value (string or object) to `RegistryVersionEntry`.                                                                            |
| `MODULE_MANIFEST_FILENAME`, `DEFAULT_MODULE_PATHS`, `DEFAULT_MODULE_PORT`, `VERIFICATION_STATUSES`        | const          | Constants for the contract / runtime / registry.                                                                                                         |

Key types: `ModuleManifest` (+ `ModuleEnvVar`, `ModuleAuthor`, `ModuleManifestPaths`, `ModuleRegistryMeta`), `ModuleAppConfig`, `BootModuleOptions` / `BootedModule`, `StartModuleAppOptions` / `RunningModuleApp`, `ModuleRef`, `ModuleValidationReport`, `RegistryIndex` / `RegistryModuleEntry` (back-compat alias `RegistryIndexEntry`) / `RegistryVersionEntry` / `RegistryOwner` / `RegistryAuthor` / `RegistryVerification`, `ResolvedRegistryModule`, `VerificationStatus` / `VerificationPolicy`, `LinkService` / `LinkDefinition` / `LinkEndpoint` / `LinkOptions` / `LinkRowRef` / `LinkModelRef`.

See the [`damat.json` reference](./MODULES.md) for the full manifest contract.

## How it fits

Depends on (all `@damatjs/*` workspace packages):

- `@damatjs/services` — `defineModule`, `ModuleService`, `PoolManager`.
- `@damatjs/framework` — bootstrap, `initializeServices`, app-side module registry.
- `@damatjs/orm-connector` / `orm-migration` / `orm-model` / `orm-type` —
  connection, migrations, model DSL, and schema contracts.
- `@damatjs/module-generator` — standalone module generation and scaffolding.
- `@damatjs/workflow-engine` — workflow authoring surface.
- `@damatjs/logger`, `@damatjs/deps` — logging, bundled deps (Hono, Zod).

Depended on by (in-repo):

- `@damatjs/damat-cli` — the `damat` CLI (`module add` / `module dev` / migrations / codegen).

## Documentation

- [Internals & maintainer guide](./docs/README.md)
- [Damat full guide](../../docs/GUIDE.md)
- [`damat.json` manifest reference](./MODULES.md)

## License

MIT
