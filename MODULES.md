# Damat Modules

A damat module is a **standalone package**: its own `package.json`, its own
tests (service, workflow, AND api), and its own live dev server — but it is
not a full backend. The module runtime (`@damatjs/module`) gives every module
the framework's full capabilities; the author only writes what is custom to
the module.

Distribution is shadcn-style: a CLI fetches the module from the registry and
**inserts its source into your backend**, where it just fits in. You own the
inserted code.

```
author standalone ──► publish to registry ──► damat module add ──► runs in any backend
   (dev/test/run)        (index entry)          (code inserted)
```

## Module package layout

```
user-management/                  # a package, not an app
├── package.json                  # scripts: dev, test, migration:create, codegen, validate
├── tsconfig.json
├── module.config.ts              # THE ONLY module-custom setup
├── .env / .env.example
├── playground.ts                 # optional script-style runner
├── tests/
│   ├── contract.test.ts          # manifest + registry readiness
│   ├── service.test.ts           # service logic via bootModule (no server)
│   ├── workflow.test.ts          # sagas + compensation via bootModule
│   └── api.test.ts               # the LIVE app on a random port (startModuleApp)
└── src/                          # ← this is what gets inserted into a backend
    ├── module.json               # portable manifest (env, deps, registry metadata)
    ├── index.ts                  # defineModule(...) + ModuleRegistry augmentation
    ├── accessor.ts               # typed service getter for steps/routes
    ├── service.ts                # class extends ModuleService({ models, credentialsSchema })
    ├── config/                   # zod credentials schema + (env) => credentials
    ├── models/                   # one model per file
    ├── migrations/               # generated SQL + snapshot
    ├── types/                    # generated row types + zod schemas
    ├── workflows/                # steps (one per file) + workflows
    ├── utils/                    # module-private helpers
    └── api/routes/               # file-based routes served by the module's own server
```

Everything imports from **one dependency**: `@damatjs/module` re-exports the
whole authoring surface — `defineModule`, `ModuleService`, `model`/`columns`,
`createStep`/`createWorkflow`/`Effect`, `getModule`/`registerModule`,
`RouteHandler`/`RouteValidator`, and `z`.

Reference implementation: `backend/examples/modules/user-management`
(workspaces, teams, memberships, API keys, a compensating onboarding saga,
and HTTP routes).

## Authoring workflow

```bash
damat module init billing          # scaffold a complete module package
cd billing && bun install

# write src/models/*, src/service.ts, src/workflows/*  — the custom parts
bun run migration:create           # diff models -> SQL migration (no app needed)
bun run codegen                    # row types + zod schemas
bun run dev                        # LIVE app: your routes + /health, hot reload
bun test                           # contract + service + workflow + api suites
bun run validate                   # contract + registry readiness
```

`module.config.ts` is the only setup an author touches:

```ts
import { defineModuleConfig } from "@damatjs/module";

export default defineModuleConfig({
  projectConfig: { http: { port: 7654 } },
});
```

### Standalone test/run building blocks

```ts
import { bootModule, withModule, startModuleApp } from "@damatjs/module";

// service/workflow tests — db + migrations + module, no HTTP
const booted = await bootModule(myModule, { moduleDir: join(import.meta.dir, "../src") });

// api tests — the real server on a random port
const app = await startModuleApp({ packageDir: join(import.meta.dir, ".."), port: 0 });
await fetch(`http://localhost:${app.port}/api/...`);
await app.stop();
```

Gate database suites with `describe.skipIf(!process.env.DATABASE_URL)`.

## The registry

The registry is an index mapping module refs to fetchable sources. Point
`DAMAT_MODULE_REGISTRY` at an index URL or file:

```json
{
  "modules": {
    "damatjs/user-management": {
      "source": "https://github.com/damatjs/modules.git#main",
      "versions": { "0.0.1": "..." }
    }
  }
}
```

Refs follow `namespace/name@version` (`parseModuleRef` /
`formatModuleRef` in `@damatjs/module` define the format). A local demo
registry lives at `backend/examples/registry.json`.

## Installing into a backend

```bash
DAMAT_MODULE_REGISTRY=https://registry.example.com/index.json \
  damat module add damatjs/user-management

# also works without a registry:
damat module add ./path/to/module-package
damat module add user/repo/sub/dir          # github shorthand
damat module add https://github.com/u/r.git#main
```

`module add` inserts the package's `src/` into `src/modules/<name>` and:

1. registers it in `damat.config.ts` (key MUST equal the module id — quoted
   for kebab-case — or the migration tracker double-runs migrations)
2. appends missing env vars to `.env.example`, warns about required ones
3. installs the module package's non-`@damatjs` dependencies via `bun add`

Then `bun damat-orm migrate:up` and restart. Tests and package scaffolding
stay with the standalone package — the host receives clean runtime code.

## Rules that keep modules portable

- **One import**: only `@damatjs/module` (plus generated `@damatjs/deps/zod`
  imports in codegen output).
- **No cross-module internals.** Reference other modules by id
  (`manifest.modules`) and store foreign ids as plain columns — no FKs across
  modules.
- **Env only via `config/load.ts`** — declared in `module.json#env`.
- **Migrations are append-only** once published.
- The host app does not auto-mount module routes yet (`src/api/routes` serves
  the standalone server today; host mounting is the next step).
