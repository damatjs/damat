# AGENTS.md — working in the Damat repo with AI

This file orients an AI coding assistant (Claude Code, Cursor, etc.) working in
the **Damat** monorepo. It is the machine-facing companion to the human
[Damat Guide](./docs/GUIDE.md). Read this first, then the specific package
`docs/` for whatever you're changing.

> Humans: this is written for AI agents, but it's also a concise map of the repo.

---

## What Damat is (one paragraph)

Damat is a composable TypeScript backend framework (Bun + Hono + Effect-TS +
Better Auth + PostgreSQL). Apps are assembled from self-contained **modules**
(models + migrations + service + config + workflows) registered in a single
`damat.config.ts`. It's a Bun + Turborepo monorepo of ~24 packages plus a
reference backend.

---

## Ground rules for agents

1. **Trust source, not the root README's history.** Package **names** and
   **versions** come from each package's `package.json`. (The repo was renamed
   over time — e.g. env is `@damatjs/load-env`, redis is `@damatjs/redis`.)
2. **Bun, not npm/yarn/pnpm.** Use `bun install`, `bun run <script>`, `bun test`.
   `packageManager` is pinned to `bun`.
3. **Don't add heavy dependencies.** `.bunfig.toml` enforces a release-age delay
   and disables install scripts. Prefer the in-repo `@damatjs/*` packages and
   the curated re-exports in [`@damatjs/deps`](./packages/deps/README.md).
4. **TypeScript, ESM, strict.** All packages are `"type": "module"` and extend
   [`@damatjs/typescript-config`](./packages/typescript-config/README.md).
5. **Keep docs in sync — two tiers.** Living docs (package `README.md` + `docs/`,
   the guide) describe the **current version only**; the change history + upgrade
   steps live in **`releases/<package>/`**. Change a package → update both tiers.
   Full rules: [Documentation & releases standard](./docs/DOCUMENTATION-STANDARD.md).
6. **Tests live next to code** (`src/tests/`, `tests/`, or `*.test.ts`). Run the
   package's `test` script.
7. **Small, single-purpose files — readability is the highest priority.** Every
   code file must stay at 100 physical lines or fewer, including production code,
   tests, scripts, fixtures, and generated code. Before a file crosses the limit,
   split it by concern into clearly named sibling files or subfolders and
   explicitly import/call those units. Generated output must be emitted in named
   chunks rather than receiving an exemption. Don't re-export what a package
   already provides (e.g. a `ModuleService` accessor's CRUD) — call it directly;
   only write genuinely new, domain-specific code.

---

## Repo map

```
damat/
├── damat.config.ts is per-app (see backend/default)
├── turbo.json                 # build/lint/check-types/dev pipeline
├── docs/GUIDE.md              # the human usage guide
├── MODULES.md                 # the module.json manifest contract
├── AGENTS.md                  # this file
├── .mcp.json                  # MCP server wiring (module install)
├── .claude/skills/            # Claude Code skills
├── backend/default/           # @damatjs/default — reference app
└── packages/
    ├── framework/             # @damatjs/framework — app framework (config, router, server, bootstrap)
    ├── service/               # @damatjs/services — ModuleService, PoolManager, defineModule
    ├── link/                  # @damatjs/link — cross-module links (junction tables, fetch, graph query)
    ├── module/                # @damatjs/module — the module system (authoring, manifest, harness, runtime, registry)
    ├── module-generator/      # @damatjs/module-generator — discovery, output, registries, CRUD, barrels
    ├── workflow-engine/       # @damatjs/workflow-engine — saga engine (Effect-TS)
    ├── deps/                  # @damatjs/deps — pinned external re-exports
    ├── typescript-config/     # @damatjs/typescript-config — shared tsconfig
    ├── mcp/                   # @damatjs/mcp — MCP server for module install
    ├── core/
    │   ├── cli/               # @damatjs/cli — general CLI framework
    │   ├── schema-codegen/    # @damatjs/schema-codegen — pure ModuleSchema to TypeScript/Zod source
    │   ├── codegen/           # @damatjs/codegen — compatibility facade only
    │   ├── env/               # @damatjs/load-env — .env cascade loader
    │   ├── logger/            # @damatjs/logger — structured logging
    │   ├── redis/             # @damatjs/redis — cache/queue/lock/session/rate-limit
    │   ├── events/            # @damatjs/events — typed event bus (+ model CRUD events, Redis broadcast)
    │   ├── jobs/              # @damatjs/jobs — background jobs & worker on the Redis queue
    │   └── types/             # @damatjs/types — error classes & shared types
    ├── auth/
    │   ├── core/              # @damatjs/auth — provider-agnostic auth contract + middleware
    │   ├── better-auth/       # @damatjs/auth-better-auth — Better Auth adapter (in-backend)
    │   ├── clerk/             # @damatjs/auth-clerk — Clerk adapter (hosted, verify-only)
    │   └── auth0/             # @damatjs/auth-auth0 — Auth0 adapter (JWKS verify-only)
    ├── orm/
    │   ├── main/              # @damatjs/orm — umbrella re-export
    │   ├── model/             # @damatjs/orm-model — fluent model DSL
    │   ├── pg/                # @damatjs/orm-pg — EntityManager + Repository + query builder
    │   ├── connector/         # @damatjs/orm-connector — pg pool/connection manager
    │   ├── migration/         # @damatjs/orm-migration — module-aware migrations
    │   ├── processor/         # @damatjs/orm-processor — snapshot/diff/SQL generation
    │   ├── core/              # @damatjs/orm-core — registry + query logging
    │   ├── type/              # @damatjs/orm-type — shared ORM types
    │   └── cli/               # @damatjs/orm-cli — `damat-orm` migrations
    └── cli/
        ├── codegen/           # @damatjs/cli-codegen — codegen and barrel command adapters
        └── damat/             # @damatjs/damat-cli — `damat` dev/build/module CLI
```

Each package's `docs/README.md` is the internals index — go there before
editing that package.

---

## Commands

```bash
bun install                  # install workspace deps
bun run build                # turbo: build all packages
bun run dev                  # turbo: dev (persistent)
bun run lint                 # turbo: lint
bun run check-types          # turbo: typecheck
bun run format               # prettier
bun test                     # tests

# In a Damat app (e.g. backend/default):
bun run dev                  # damat dev
bun run db:migrate           # damat-orm migrate:up
bun run db:status            # damat-orm migrate:status
```

Build order is dependency-driven by Turborepo (`^build`). The dependency spine
is roughly: `types`/`deps` → `orm-type` → `orm-model` → `orm-core`/`orm-pg`/… →
`services` → `framework` → `module` → CLIs.

---

## How to do common tasks

### Add a column / model to a module

1. Edit/add a model in `src/modules/<m>/models/` using the
   [orm-model DSL](./packages/orm/model/README.md).
2. Export it from the module's `service.ts` `models` map.
3. `damat module migration:create` (in a module package) **or**
   `damat-orm migrate:create <name>` (in an app) to generate the migration.
4. `damat-orm migrate:up`. Optionally `damat codegen <module>` (or `--all`).

### Add an HTTP route

Create `src/api/routes/<path>/route.ts` exporting `GET`/`POST`/… as
`RouteHandler` or `defineRoute<Params>` from `@damatjs/framework/router`.
Dynamic segments use `[param]` folders. See
[framework → router](./packages/framework/docs/router.md).

### Create a new module

`damat module init <name>`, implement `index.ts`/`service.ts`/`models/`, add a
`module.json` ([MODULES.md](./MODULES.md)), then `damat module validate`. Develop
and test it standalone with the [`@damatjs/module`](./packages/module/README.md)
harness (`withModule`/`bootModule`).

### Install an existing module

Prefer the MCP tools (below) or the CLI:
`damat module add <registry-ref | path | github | git-url>` →
`damat-orm migrate:up` → restart. See
[the guide](./docs/guide/14-installing-modules.md).

### Add a workflow

Define steps with `createStep` (forward + compensation) and compose them with
`createWorkflow`. Steps are directly callable: `(input, ctx) => myStep(input, ctx)`
for one step, or `yield* myStep(input, ctx)` inside `Effect.gen` for several. Pass
an optional third arg to override retry/timeout per call —
`myStep(input, ctx, { timeoutMs, retry })`. See
[workflow-engine](./packages/workflow-engine/README.md).

### Link two modules (cross-module relationship)

Modules can't FK into each other, so a many-to-many relationship lives **outside**
both modules in `src/links/<owner>/` (mirroring a module: `models/`, `index.ts`,
`migrations/`). The junction table is auto-generated; neither module imports the other.

1. `src/links/<owner>/models/<a>-<b>.ts`: `export default defineLink({ module, model, field }, { module, model, field })`.
2. `src/links/<owner>/index.ts`: `export const links = [...]; export const models = collectLinkModels(links);`.
3. `src/links/index.ts`: aggregate every owner and `export default defineLinkModule(links)`.
4. Point `damat.config.ts` at it: `links: "./src/links"`.
5. `damat-orm migrate:create link:<owner>` → `damat-orm migrate:up`, then
   `damat codegen <module>` so each side gains the linked field.
6. At runtime use `getModule("link")` → `create` / `dismiss` / `fetch` / `graph`.
   Import `defineLink` / `collectLinkModels` / `defineLinkModule` from
   `@damatjs/framework`. Links are an **app / backend-owner** concern — a module
   never defines them. Full guide: [`@damatjs/link`](./packages/link/README.md).

---

## Installing modules via MCP (for AI assistants)

The [`@damatjs/mcp`](./packages/mcp/README.md) server (wired in `.mcp.json`)
exposes safe tools so you can install modules without hand-editing files:

| Tool                              | Use it to                                        |
| --------------------------------- | ------------------------------------------------ |
| `search_modules` / `list_modules` | discover modules in the registry                 |
| `module_info`                     | inspect a module before installing               |
| `add_module`                      | install it (runs the audited `damat module add`) |
| `list_installed`                  | see what's already installed                     |

Recommended flow: **search → module_info → add_module → tell the user to run
`damat-orm migrate:up` and restart.** Respect the verification gate
(`DAMAT_MODULE_VERIFY`); never bypass a `rejected`/`revoked` module. Set
`DAMAT_MODULE_REGISTRY` to enable registry tools; without it, install from a
path or git URL.

Two Claude Code skills encode the workflows:

- **`damat-backend`** ([.claude/skills/damat-backend](./.claude/skills/damat-backend/SKILL.md))
  — backend work **and assembling the app**: models, services, routes, workflows,
  migrations, run/debug, and installing / linking / composing modules.
- **`damat-modules`** ([.claude/skills/damat-modules](./.claude/skills/damat-modules/SKILL.md))
  — authoring one self-contained, shareable module (the blade); no composition.

---

## Conventions cheat-sheet

- App code imports `defineConfig`, `defineModule`, `ModuleService`, `getModule`
  from **`@damatjs/framework`**; standalone module code imports the same surface
  from **`@damatjs/module`**.
- `modules` in `damat.config.ts` is a **keyed object** `{ id: { resolve, id } }`,
  not an array.
- `ModuleService({ models, credentialsSchema })` — object args, not positional.
- Models: `model(table, columns).indexes([...]).timestamps().softDelete()`;
  relations reference the **target table name** (`columns.hasMany("accounts")`).
- Use `@damatjs/deps/<lib>` (e.g. `@damatjs/deps/zod`) instead of importing
  `zod`/`hono`/`effect`/`pg`/`ioredis` directly.
- Cross-module relationships are **links**, not relations, and are an
  **app/backend-owner** concern: declare them in `src/links/` (never inside a
  module), wire `links:` in `damat.config.ts`, and reach them at runtime via
  `getModule("link")`. `defineLink`/`collectLinkModels`/`defineLinkModule` come
  from `@damatjs/framework` only. A module may suggest pairings with a non-binding
  `pairsWith` hint in `module.json` but never defines links. See
  [`@damatjs/link`](./packages/link/README.md).

---

## Documentation & releases (read before editing docs)

Two separate tiers — keep them apart. Full rules:
[Documentation & releases standard](./docs/DOCUMENTATION-STANDARD.md).

- **Living docs** — package `README.md`, package `docs/`, and `docs/guide/`
  describe the software **as it is now**. No version annotations ("new in X",
  "since", "deprecated"), no change history, no upgrade steps. When behavior
  changes, edit them in place and delete the old description.
- **Release notes** — [`releases/<package>/`](./releases/README.md) is the change
  record: one folder per package (its unscoped name), an index `README.md`, and a
  `<version>.md` per version with package-relevant changes (before → after +
  action required). Pure dependency/CI bumps are noted in the index, no file.

**When you change a package**, in the _same_ change: (1) update its living docs to
the new behavior, (2) add `releases/<package>/<new-version>.md`, (3) update
`releases/<package>/README.md`. A change isn't done until both tiers are updated —
living docs that mention a version, or a behavior change with no `releases/` entry,
are defects.

---

## Where to read more

- [docs/GUIDE.md](./docs/GUIDE.md) — full usage walkthrough.
- [MODULES.md](./MODULES.md) — the `module.json` contract + registry/trust model.
- [docs/DOCUMENTATION-STANDARD.md](./docs/DOCUMENTATION-STANDARD.md) — docs + releases rules.
- [releases/](./releases/README.md) — per-package version history & upgrade notes.
- Any `packages/**/docs/README.md` — that package's internals.
