# Authoring a Damat module (forward guide)

You are building **one Damat module** from scratch. This guide is the canonical,
forward-looking authoring reference: standalone-first, alias-correct, codegen-driven.
Read it once, top to bottom, before you write any code.

It **defers** to:
- [`MODULE-STANDARDS.md`](./MODULE-STANDARDS.md) — the lean-service / `lib/` / `types/` /
  100-line house rules. This guide references those rules; it does not restate them.
- the generated **`AGENTS.md`** inside your module — framework mechanics for the exact
  structure you scaffolded.

It **supersedes** the clone-framed shapes formerly described elsewhere — the old
"umbrella import + `accessor.ts` + `utils/` at root" shape and the clone-from-`old/`
framing. Where this guide conflicts with anything you remember from those, this wins.

Worked references for the lean-service / `lib` / `types` shape: **`medical/referral`**
(lean, single-table, one custom saga) and **`ai/layer`** (the full `lib/{providers,
pricing,utils,gateway}` subsystem shape). These live in the sibling **library repo**
(not this framework repo); as shipped THERE they still use deep relative imports
(`../../../types`) and flat-by-table workflow nesting and have **not** been regenerated.
Read them for the lean-service / `lib` / `types` shape only — **never** as alias or
nesting exemplars. For an in-repo exemplar of the current shape, see
[`modules/module-sample/`](../modules/module-sample/).

---

## 1. A module is a STANDALONE unit

A module is **not part of this monorepo**. It is a single, self-contained, shareable
package that any Damat app installs with one command. You author it **from scratch**:

```bash
cd <your-module-library>/<category>/   # where you keep modules; category is just a folder
damat module init <name>      # scaffolds a COMPLETE standalone package
cd <name> && bun install
```

`damat module init` gives the module **its own** `package.json`, `tsconfig.json`,
`.env.example`, tests, and a live dev server (`bun run dev`). You develop, migrate,
codegen, test, and run it entirely on its own — no host app, no workspace.

Consequences — internalize these:

- **NOT a Turborepo workspace member.** The library repo-root `README.md` is an
  unmodified Turborepo starter — **ignore it**. It does not describe modules. A module
  is never a workspace package; its deps are real npm `@damatjs/*` packages.
- **NOT necessarily a clone.** You author the feature directly. There is no `SOURCE`
  module, no "clone `old/<name>`" step. (The clone docs are legacy.)
- **Category is just a filing directory.** `medical/`, `finance/`, `ai/`, `shared/` …
  are folders for humans to browse. The category is **never encoded** in the module —
  not in `module.json`, not in the package name, not in table names, not in imports. A
  module can be re-filed under a different folder with zero code changes.

  Example folders humans browse (a starting taxonomy — adjust freely): `finance`,
  `medical`, `property` (PMS), `hospitality`, `retail`, `inventory` (WMS),
  `manufacturing` (MES), `fleet`, `hr`, `crm`, `procurement`, `sales`, `subscription`,
  `common` / `shared`. Anything genuinely cross-cutting goes under `common`/`shared`. A
  module is just a directory and can be re-filed later.
- **A module is a single-purpose blade.** It does one thing and stays import-isolated.
  No cross-module links, no `defineLink`, no importing another module, no deciding what
  it plugs into. Reference other modules' rows by **plain text id columns** (no FK), and
  leave a non-binding `pairsWith` hint in `module.json`. Composition is the consuming
  app's job, not yours. (Full rule in `AGENTS.md` and `MODULE-STANDARDS.md`.)

```bash
bun run dev               # the module's OWN server + DB, hot reload
bun run migration:create  # diff models -> a SQL migration
bun run codegen           # generate types + scaffold CRUD steps/workflows/routes
bun run typecheck         # tsc --noEmit
bun run validate          # module.json contract + registry-readiness
bun test                  # contract + service + workflow + api suites
bun run playground        # script-style end-to-end runner
```

### Standalone test/run building blocks

Tests and the playground boot the module on its own — no host app. Three helpers from
`@damatjs/module` do it:

```ts
import { bootModule, withModule, startModuleApp } from "@damatjs/module";

// service/workflow tests — db + migrations + module, no HTTP
const booted = await bootModule(myModule, { moduleDir: join(import.meta.dir, "../src") });

// api tests — the real server on a random port
const app = await startModuleApp({ packageDir: join(import.meta.dir, ".."), port: 0 });
await fetch(`http://localhost:${app.port}/api/...`);
await app.stop();
```

Gate database suites with `describe.skipIf(!process.env.DATABASE_URL)` so they skip
cleanly when no `DATABASE_URL` is set.

---

## 2. The portable alias rule (non-negotiable)

A module's imports must resolve **identically** in two places: standalone (here) and
after `damat module add` inserts `src/` into a host backend. The host moves some parts
out of the module dir and keeps others inside, so a naive relative chain
(`../../../../types`) or a workspace import breaks on install. Two aliases solve it,
split by whether a part **stays inside** the module or **moves out**.

### 2.1 Stay-inside → `@<module>/*`

`types`, `config`/`schema`, `service`, `lib`, `models` **stay** under
`src/modules/<module>/` after install. **Types stay inside** — they are not moved out.
Address them all by the **module-name alias**.

- Your module's `tsconfig.json` (added by `damat module init`):
  ```jsonc
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@<module>/*": ["./src/*"] }
  }
  ```
- The host backend's `tsconfig.json` (added by `damat module add` on install):
  ```jsonc
  "paths": { "@<module>/*": ["./src/modules/<module>/*"] }
  ```
- The **same** specifier resolves in both:
  ```ts
  import type { Referrals, NewReferrals } from "@referral/types";
  import { schema } from "@referral/config/schema";
  import type { ReferralService } from "@referral/service";
  // cross-module type-only reference (only the codegen link augmentation needs it):
  import type { Patients } from "@patient/types";
  ```

### 2.2 Move-out → shared `@workflows/*`

`api/routes/` and `workflows/` **move out** into the app's top-level `src/api/routes/`
and `src/workflows/` on install. Address workflows by a **shared alias that names the
same directory in both contexts**, so it survives the move.

- **Both** module and backend `tsconfig.json`:
  ```jsonc
  "paths": { "@workflows/*": ["./src/workflows/*"] }
  ```
- **Stability rule:** scaffold workflows under `src/workflows/<module>/<table>/…` —
  mirroring exactly where install places them. So
  `@workflows/<module>/<table>/workflows/<name>` is **byte-identical before and after
  install**. The `<module>/` namespacing is what keeps the shared alias collision-free
  across modules.
  ```ts
  // generic form — resolves identically standalone and after install:
  import { createWidgetsWorkflow } from "@workflows/<module>/<table>/workflows/createWidgets";
  ```
  > **Codegen emits exactly this** today: `bun run codegen` writes the `@workflows/*`
  > alias and the `<module>/<table>` nesting, so a freshly scaffolded or regenerated
  > module's `@workflows/<module>/<table>/...` path is **byte-identical before and after
  > install**. The only exceptions are the two un-regenerated sibling-library modules
  > `medical/referral` and `ai/layer`: as shipped THERE they still import workflows with
  > a deep relative chain (e.g. `../../../workflows/referrals/workflows/createReferrals`)
  > and nest workflows flat by table (`src/workflows/referrals/`,
  > `src/workflows/layerPrompts/`), so don't expect the literal `@workflows/referral/...`
  > path to resolve in **those** modules until they're regenerated.
- **API routes are leaf consumers** — nothing imports them, so they need no alias of
  their own. A route just *uses* `@workflows/<module>/…` (to reach a workflow) and
  `@<module>/…` (to reach types). Routes install flat at `src/api/routes/<table>/`.

### 2.3 NO `@/` in portable module code

The host backend already binds `@/` → `./src` (the **app** root). A moved-out module
file that imported `@/types` would resolve to the **app's** `src/types`, not the
module's — a silent wrong-target collision. So:

> **Never use `@/` in a module.** `@<module>/*` is the only install-stable anchor for
> stay-inside code; `@workflows/*` for workflows. Sibling re-exports (`./create<Pascal>`,
> `./api`, `./validator`, `./index`) stay relative — they always move together.

Codegen emits these aliases for you. When you hand-write a file, follow the same
specifiers; don't invent a new alias and don't flatten files to dodge a deep path.

---

## 3. The canonical layout (one shape)

Older docs described several different module shapes. **This is the one to follow**;
where it conflicts with anything you remember, this wins. `medical/referral` and
`ai/layer` demonstrate the parts of this shape that are already settled — the lean
category-D service, the `lib/{gateway,providers,pricing,utils}` organization, and types
under `src/types/`. The **alias scheme** (`@<module>/*`, `@workflows/*`) and the
**`<module>/<table>` workflow nesting** shown below are **what `bun run codegen` emits
today**. The only caveat: the sibling-repo modules `medical/referral` and `ai/layer`
have **not** been regenerated yet and still ship deep relative imports
(`../../../types/index`) with flat-by-table workflows — read them for the
service/`lib`/`types` shape, not as alias-or-nesting exemplars.

```
<module>/                         # standalone package, NOT a workspace member
├── package.json                  # @damatjs-modules/<module>; scripts wrap the damat CLI
├── tsconfig.json                 # baseUrl + paths: @<module>/* and @workflows/*  (§2)
├── module.config.ts              # defineModuleConfig — module-local runtime (e.g. http port)
├── .env.example
├── playground.ts                 # script-style end-to-end runner
├── tests/                        # contract + service + workflow + api
└── src/                          # ← exactly this is inserted into a backend
    ├── module.json               # portable contract (name, version, env, packages, pairsWith)
    ├── index.ts                  # defineModule(...) + public re-exports
    ├── service.ts                # LEAN: collectModels([...]) + category-D 1-line delegates
    ├── config/
    │   ├── schema/index.ts       # zod credentials schema
    │   ├── load.ts               # (env) => credentials
    │   └── index.ts              # default export { schema, load }
    ├── models/                   # one table per file
    ├── migrations/               # generated SQL + schema-snapshot.json
    ├── types/                    # GENERATED row types/zod/registry + HAND-ADDED request/record types
    ├── lib/                      # everything the service calls (see below)
    │   ├── providers/            # third-party SDK adapters (one per file) + contract + registry
    │   ├── pricing/              # types.ts · table.ts (data) · compute.ts (logic) · index.ts
    │   ├── utils/                # constants.ts + one pure helper per file
    │   └── gateway/              # the table's category-D ops the service delegates to
    ├── workflows/                # scaffolded under <module>/<table>/{steps,workflows}/  (§2.2)
    └── api/routes/               # scaffolded per table; route → workflow only
```

The reconciliation, point by point — what this shape fixes vs the stale docs:

- **Split-package imports — never the `@damatjs/module` umbrella for authoring.** Import
  each symbol from its real package, so the code fits unchanged when an app pulls it in:
  ```ts
  import { defineModule, ModuleService } from "@damatjs/services";
  import { getModule } from "@damatjs/framework";
  import { model, columns, collectModels } from "@damatjs/orm-model";
  import { createStep, createWorkflow, executeStep, Effect } from "@damatjs/workflow-engine";
  import type { RouteHandler, RouteValidator } from "@damatjs/framework/router";
  import { z } from "@damatjs/deps/zod";
  ```
  (`@damatjs/module` carries only contract/config/runtime/tooling —
  `defineModuleConfig`, `bootModule`/`withModule`, `validateModuleDir`. The older
  "one import `@damatjs`" umbrella shape is superseded.)
- **`getModule`, not `accessor.ts`.** Reach the service from a step with the typed
  `getModule("<module>")`. There is **no `accessor.ts`**. The
  typing comes from the **generated** `src/types/registry.ts` (`ModuleRegistry`
  augmentation) — you never hand-write it.
- **`src/lib/{providers,pricing,utils,gateway}`** — everything the service calls lives
  under `src/lib/`, organized by concern (not a root-level `utils/`, not SDK code loose
  in `service.ts`). See [`MODULE-STANDARDS.md`](./MODULE-STANDARDS.md) for the per-folder
  rules (the sibling-repo `ai/layer` shows the worked shape).
- **`src/types/*` = generated + hand-added.** Generated (don't edit): `<table>.ts`,
  `<table>.zod.ts`, `index.ts`, `registry.ts`. Hand-added (codegen preserves extra
  files here): your request/response/filter/record types. Never inline a type in the
  service — import it from `./types/<name>` / `@<module>/types/<name>`.
- **Lean, category-D-only service.** `ModuleService({ models, credentialsSchema })`
  already gives every table the full accessor surface. The service holds **only**
  category-D one-liners. (Full keep/drop table in `MODULE-STANDARDS.md`.)

`models` is always an **array** via `collectModels`, and accessor keys derive from the
**table name** (camelCased, never pluralized): `model("layer_sessions")` →
`service.layerSessions`. The table name is the single source of truth — never hand-write
a key.

```ts
// src/service.ts — the shape (see medical/referral for the real file)
import { ModuleService } from "@damatjs/services";
import { collectModels } from "@damatjs/orm-model";
import { schema } from "@<module>/config/schema";
import { WidgetModel } from "@<module>/models/widget";
import * as gateway from "@<module>/lib/gateway";

export const models = collectModels([WidgetModel]); // -> { widgets: WidgetModel }

export class WidgetService extends ModuleService({ models, credentialsSchema: schema }) {
  // ONLY category-D delegates, each one line. NO CRUD passthroughs.
}
```

---

## 4. The empty-gateway baseline

> A plain-CRUD module has **NO service methods** and **NO `lib/gateway`**.

`ModuleService({ models })` already exposes the entire single-table surface
(`create / createMany / find / findOne / findById / findMany / update / updateOne /
upsert / upsertMany / delete / softDelete / restore / count / exists`, with
`delete`/`softDelete` taking `cascade: true`). Steps, routes, and tests call the
accessor directly. So a CRUD-only module's `service.ts` is just:

```ts
export const models = collectModels([WidgetModel]);
export class WidgetService extends ModuleService({ models, credentialsSchema: schema }) {}
// empty body — that's correct, not unfinished
```

**Add a gateway ONLY for genuine category-D logic** — validation/branching pipelines,
multi-table aggregates/roll-ups, money/posting/numbering/scheduling math, or third-party
integrations. Each such operation becomes **one** lean `lib/gateway` function (takes the
service as its first arg, persists via the accessor) and **one** one-line service
delegate:

```ts
run(req: AiRunRequest) { return gateway.run(this, req); }   // ai/layer
createReferral(input: CreateReferralInput) { return gateway.createReferral(this, input); }  // referral
```

> **The failure to avoid:** "every exemplar has a `lib/gateway`, so I must invent one."
> No. `ai/layer` and `referral` have gateways because they have real category-D logic.
> If your module is plain CRUD, the empty service **is** the finished service. Inventing
> `getWidget`/`listWidgets`/`setStatus`/`deleteWidgetCascade` wrappers is a defect — see
> the keep/drop table in `MODULE-STANDARDS.md`.

---

## 5. Admin full-CRUD is generated — cover every table

You do **not** hand-write CRUD. For **every** model, `bun run codegen` scaffolds the
complete per-table admin surface:

- `src/workflows/<module>/<table>/steps/{create,find,findMany,update,delete}<Table>.ts`
  — each step calls the accessor and ships a compensation/fallback hook.
- `src/workflows/<module>/<table>/workflows/{…}.ts` — one workflow per operation.
- `src/api/routes/<table>/…` — split route files (`api`/`validator`/`query`/`route`),
  each handler calling a workflow only.

**These generated CRUD routes/workflows ARE the module's complete admin surface.** A
human or admin UI can create/list/read/update/delete every table out of the box. So:

- **Cover every table.** Each model you add gets its full CRUD slice generated — don't
  skip one and don't leave a table without its routes.
- **Don't hand-write or duplicate CRUD.** Never add a `service.getWidget` or a parallel
  hand-rolled create route. The generated slice is canonical; extend it in place.

Custom (non-CRUD) workflows and routes live **alongside** the generated ones (e.g.
`ai/layer`'s `runAiSession` workflow + `/runs` route; `referral`'s `referralDispatch`
saga + `/dispatch` route) — never replacing the per-table CRUD.

---

## 6. The regenerate/merge loop

The core rhythm is **models → migration → codegen → extend**, repeated. Know which files
codegen **overwrites** every run versus **scaffolds once**:

| Path | Behavior on every `codegen` | You |
|---|---|---|
| `src/types/<table>.ts`, `*.zod.ts`, `types/index.ts`, `types/registry.ts` | **OVERWRITTEN** | never hand-edit — regenerate |
| `src/types/<your-name>.ts` (hand-added) | **preserved** (extra files kept) | own your request/record types here |
| `src/workflows/<module>/<table>/…` (steps + workflows) | **SCAFFOLD-ONCE** — created if missing, your edits kept | put real logic in the steps |
| `src/api/routes/<table>/…` | **SCAFFOLD-ONCE** — your edits kept | shape responses; call workflows |

The loop:

```bash
# 1. add/adjust models in src/models/<name>.ts
bun run migration:create     # 2. diff models -> a NEW SQL migration; review it
bun run codegen              # 3. regenerate types/registry; scaffold any NEW table's CRUD
# 4. extend ON TOP: real logic in the scaffolded steps; category-D in lib/gateway + a
#    one-line service delegate; custom workflows/routes alongside the generated ones
bun run typecheck            # 5. verify
```

**Iron rules of the loop:**

- **Never hand-write CRUD.** It is generated. Re-running codegen after a model change is
  the only way to keep types/registry in sync.
- **Never create a competing parallel route/step/workflow.** If the generated
  `createWidgets` step needs more behavior, edit *that* step — don't add a second
  `createWidget2` next to it. Extend, never fork.
- **Migrations are append-only once published.** A model change produces a *new*
  migration; you don't rewrite an old one.

### The rename → codegen → merge-back loop (general)

This is the general technique for **regenerating a slice you've already customized**
(after a model rename, a codegen-template upgrade, or when reconciling old hand-edits) —
not just a clone recipe:

1. **Rename** the customized folder aside: `src/workflows/<module>/<table>` →
   `…/<table>_old` (likewise a route folder). This frees codegen to emit a clean slice.
2. **`bun run codegen`** — produces the current, correctly-aliased, up-to-date scaffold
   in the original path.
3. **Merge back the genuinely-different bits** from `_old`: your real step bodies, custom
   compensations, extra workflows — copy them onto the fresh scaffold, keeping codegen's
   imports/aliases/signatures. Drop anything that was just stale boilerplate.
4. **Delete `_old`**, then `bun run typecheck`.

Use this whenever the generated shape has moved ahead of your copy. The output always
ends up on the current scaffold with your genuine logic layered on top — never a hand-
maintained fork drifting from codegen.

---

## 7. From-scratch checklist (paste-as-task)

A from-scratch paste-as-task — **no SOURCE, no clone, no category step-0**. Start at
`damat module init`. (The rules live in this framework repo's `spec/` — this guide plus
[`MODULE-STANDARDS.md`](./MODULE-STANDARDS.md); your modules live in your library repo.)

```text
TASK: Author a NEW Damat module `<name>` at <your-module-library>/<category>/<name>,
from scratch. It is a standalone, shareable, single-purpose blade. Follow the house
style exactly, document it, and pass all four verification gates.

READ FIRST, IN ORDER (do not guess from memory):
  1. AUTHORING-GUIDE.md   — this guide (standalone-first, aliases, the loop)
  2. MODULE-STANDARDS.md  — the lean-service / lib / types / 100-line rules
  3. (after you scaffold) the generated AGENTS.md inside the new module

SCAFFOLD (Bun + the damat CLI only; never npm/yarn/pnpm):
  cd <your-module-library>/<category> && damat module init <name> && cd <name> && bun install
  # confirm tsconfig has baseUrl + paths { "@<name>/*": ["./src/*"], "@workflows/*": ["./src/workflows/*"] }
  # confirm every @damatjs/* resolves to >= 0.3.1

FOUNDATION FIRST:
  • src/models/*  — one table per file; .timestamps() (+ .softDelete() if rows are
    preserved); reference other modules by PLAIN TEXT id columns only (no FK, no import).
  • src/config/*  — zod credentials schema + (env) => credentials; declare env in module.json.
  • src/module.json — name (kebab), version, description, env[], packages{}, pairsWith[].
  bun run migration:create     # review the SQL: every table is correct + prefixed by intent
  bun run codegen              # generates src/types/* and scaffolds per-table CRUD steps/workflows/routes

BUILD ON TOP (only what is custom):
  • Plain-CRUD module → service body is EMPTY, no lib/gateway. (§4)
  • Category-D logic ONLY → a lib/gateway function + a one-line service delegate; provider
    SDKs in src/lib/providers/*, pricing in src/lib/pricing/*, pure helpers in src/lib/utils/*.
  • Put real logic in the scaffolded steps; add custom (non-CRUD) workflows/routes ALONGSIDE
    the generated ones — never a parallel competing CRUD route/step.
  • Hand-added request/record types go in src/types/* (never inline in the service).
  • Imports: @<name>/* for stay-inside (types/config/service/lib/models), @workflows/<name>/*
    for workflows, sibling re-exports stay relative, NEVER @/. (§2)

HARD RULES (from MODULE-STANDARDS.md — non-negotiable):
  • Service is LEAN: never re-implement the accessor. Steps/routes/gateway call
    getModule("<name>").<table> directly. A service method exists ONLY for category-D logic.
  • Layering one-way: API route → workflow → step → service. Routes call workflows only;
    only steps touch the service; the service has no orchestration/compensation.
  • Everything the service calls lives under src/lib/. All types under src/types/.
  • No hand-written file over 100 lines — split by concern.
  • Stay a blade: no cross-module links/imports; foreign refs are plain id columns + a
    pairsWith hint. getModule("<name>") can return null — guard it.

VERIFICATION GATES — all four must pass:
  bun run typecheck    # exit 0
  bun run validate     # "registry-ready" (no warnings)
  bun test             # green (DB suites skip without DATABASE_URL)
  bun run playground   # runs end-to-end against the standalone server

DONE = all four gates pass AND src/module.json is complete and registry-ready.
```

---

## 8. Gotchas (learned the hard way)

- **`orm-model` does NOT auto-add timestamps.** You must call `.timestamps()`
  (`created_at`/`updated_at`) and `.softDelete()` (`deleted_at`) explicitly on a model;
  nothing adds them for you.
- **`getModule("<name>")` can return `null`.** Guard it:
  `const s = getModule("layer"); if (!s) throw …`. Generated steps already do this.
- **Codegen preserves hand-added files in `types/`, but the generated `types/index.ts`
  barrel won't re-export them.** Put your own request/record types in
  `src/types/<name>.ts` and import them directly via `./types/<name>` — don't expect the
  barrel to pick them up.
- **Multi-step custom saga = `Effect.gen` + `executeStep`.** Both come from
  `@damatjs/workflow-engine`. Pattern:
  `createWorkflow(name, (input, ctx) => Effect.gen(function*(){ const a = yield* executeStep(stepA, input, ctx); … }), { timeoutMs })`.
  A **single-step** workflow stays the direct form `(input, ctx) => step(input, ctx)`.
- **Root a custom (non-CRUD) route at a top-level path** (`/runs`, `/intake`,
  `/dispatch`) so it never collides with codegen's generated `<table>/route.ts`.
- **Import the service type-only in `lib`/`gateway`.** Passing the service into a `lib`
  function needs `import type { <Name>Service } from "@<module>/service"` — a *type-only*
  reference (erased at runtime), so there's no runtime import cycle.
