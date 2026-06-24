---
name: damat-modules
description: >-
  Author a Damat module — a single, self-contained, shareable feature (models +
  service + config + migrations + optional workflows) built and tested on its
  own. Use when the user wants to create/scaffold/build/author/package/publish/
  validate a Damat module, or turn an existing feature into a shareable module.
  NOT for installing, wiring, composing, or linking modules into an app — that is
  the damat-backend skill. Triggers: "create a damat module", "scaffold a
  module", "make this a shareable module", "author/package/validate a module".
---

# Authoring a Damat module

This skill is for **making one module**: a self-contained vertical slice
(models + migrations + service + config + optional workflows) that any Damat app
can install with one command.

**The rule that shapes everything: a module is a single-purpose blade.** It does
one thing well and stays independent. It does **not** decide how it is composed —
no cross-module links, no importing other modules, no declaring what it "needs."
If your module is most useful next to another, leave a **non-binding hint**
(`pairsWith` in `module.json`, or a line in `description`) and let the backend
owner wire it. Installing, linking, and `damat.config.ts` are the **damat-backend**
skill's job — the backend owner assembles blades into the app.

You're in **your own** module package with the `@damatjs/*` packages installed
(not the Damat monorepo). For detail, read each package's README (in
`node_modules/@damatjs/<pkg>/README.md` or on npm):
- `@damatjs/module` — the authoring surface, the `module.json` contract, and the
  standalone dev/test harness.
- `@damatjs/orm-model` — the model DSL.
- `@damatjs/damat-cli` — the `damat module` authoring commands.

## Before you start

- Damat projects are **Bun** projects. Use `bun` / `bunx`, never npm/yarn/pnpm.
- The CLI is `damat` (from `@damatjs/damat-cli`). A scaffolded module wraps it in
  `package.json` scripts, so you usually run `bun run <script>`.
- Running or DB-testing a module needs a Postgres `DATABASE_URL` in `.env`.
- If the module repo has an **`AGENTS.md`**, follow it — it is the full,
  self-contained reference (layout, the `module.json` contract, commands).

## Build a module

**Codegen is your propeller — build only what's missing.** You never hand-write
CRUD: model the data, run `bun run codegen`, and it generates the whole basic
slice (types + zod + `registry.ts`, and **scaffold-once** per-operation
`workflows/<table>` + `api/routes/<table>`, both flat by table — `damat module add`
adds the `<moduleId>/` segment on install). That generated slice carries
the module — your job is to add only the custom logic *on top of it*. So: **models
→ codegen → extend.** **Extend the generated files in place; never rebuild, fork,
or write a parallel route/step that competes with the generated one.**

**Hard rules — non-negotiable; they keep every module small, readable, and free of duplication:**
- Layering is one-way: **route → workflow → step → service**. A route ONLY calls a
  workflow (`workflow.execute(input)`) and shapes the response — never the
  service, never business logic. Only steps touch the service via
  `getModule("<name>")`; business logic + orchestration live in steps/workflows.
- **Never re-wrap what the service already gives you.** `ModuleService({ models })`
  already exposes the full per-model CRUD surface — `create`, `createMany`, `upsert`,
  `upsertMany`, `find`, `findById`, `findOne`, `findMany`, `update`, `updateOne`,
  `delete` / `softDelete` (with `cascade`), `restore`, `count`, `exists`. Do **not**
  add a service method that just forwards to one of these. No `getUser` that calls
  `find`, no `listUsers` that calls `findMany` — that is dead re-export. A step calls
  `getModule("<name>").<model>.find(...)` (etc.) **directly**. The service only gains
  **new, model-specific** logic the generated CRUD cannot do — e.g. an `ai` model's
  provider calls: the provider catalog + request/parse detail lives in
  `src/lib/<provider>.ts`, and the service method just picks the provider and invokes
  it (then may persist via the accessor). Litmus test: if a method body is a single
  CRUD call, delete the method and call the accessor from the step.
- The service is **data + new integrations only** (the generated CRUD + third-party
  do/reverse pairs) — no business logic, no orchestration, no CRUD passthroughs.
- **The service stays small — logic lives in `src/lib/`.** Everything the service
  calls lives under `src/lib/` (providers, pricing, pure helpers in `src/lib/utils/`,
  and category-D `gateway` ops); the service itself is mostly **one-line delegates**
  to those `lib/` functions. There is no top-level `src/utils/`.
- **No file over 100 lines.** Readability is the **highest priority** in every module
  (and backend). Split by concern: one model per file, one integration per
  `src/lib/<provider>.ts`, one helper-group per `src/lib/utils/<concern>.ts`. When a
  function grows, break its sub-steps into sibling files/folders so each piece reads
  on its own — a long file is a refactor signal, never a comment-it-better one.
- **Portable imports — use the SAME specifiers codegen emits; never invent one.**
  A module's imports must resolve identically standalone AND after `damat module add`
  inserts `src/` into a host app. Two tsconfig aliases split parts that **stay inside**
  the module from parts that **move out**:
  - **Stay-inside → `@<module>/*`** — `types`, `config`/`schema`, `service`, `lib`,
    `models` stay under `src/modules/<module>/`. Address them by the module-name alias
    (`import type { Widgets } from "@widget/types"`). Types stay inside — never moved out.
  - **Move-out → the bare `@workflows` barrel** — `workflows/` (and `api/routes/`)
    relocate to the app's top-level `src/workflows/` / `src/api/routes/` on install, where
    `damat module add` adds the `<moduleId>/` segment. Your module ships them **flat**
    (`workflows/<table>`), so you never write a deep workflow path: route→workflow imports go
    through the recursive `index.ts` barrel root (`import { createWidgetsWorkflow } from
    "@workflows"`), and workflow→step is a relative sibling (`../steps/createWidgets`).
    `@workflows` resolves to `src/workflows/index` identically before and after install (a
    non-wildcard `"@workflows": ["./src/workflows"]` tsconfig entry, written by the scaffold
    and `damat module add`). Barrels are auto-generated (codegen / `damat module add` /
    `damat barrel`) — never hand-edit one.
  - **Never use `@/` in module code** — the host binds `@/` → the *app* root, so a moved-out
    file importing `@/types` would silently hit the app's `src/types`. Sibling re-exports
    (`./api`, `./create<Pascal>`, `./validator`, `../steps/<op>`) stay relative — they move together.
  The only cross-module specifier you'll ever see is in codegen-generated link augmentation
  (`<table>.links.ts`), which imports the linked module's types via `@<other>/types` — you
  never hand-write it. When you hand-write a file, mirror codegen's specifiers exactly.
- **Plain-CRUD ⇒ empty service body, no `lib/gateway`.** `ModuleService({ models })` already
  exposes the entire per-table surface, so a CRUD-only module's `service.ts` is just
  `class XService extends ModuleService({ models, credentialsSchema: schema }) {}` — the empty
  body is correct, not unfinished. Add a `lib/gateway` function + a one-line service delegate
  ONLY for genuine category-D logic (validation/branching pipelines, multi-table roll-ups,
  money/numbering/scheduling math, third-party integrations). Inventing `getWidget`/`listWidgets`
  wrappers because "every exemplar has a gateway" is a defect — see `spec/MODULE-STANDARDS.md`.

1. **Start the module** — two ways, same resulting shape:
   - `bunx create-damat-app@latest <name> --module` — the getting-started command.
     By default it scaffolds locally (it runs `damat module init` for you, so you
     get the same deterministic output without depending on a remote starter
     repo); pass `--repo-url <git>` to clone a custom starter instead.
   - `damat module init <name>` — the offline local scaffold: `package.json`
     scripts, `module.config.ts`, `src/index.ts`/`service.ts`, `src/config/schema`,
     `src/module.json`, a contract test, a root `README.md`, **and the full
     `AGENTS.md` authoring guide**. `src/models/` starts empty — you add the first
     model. (Read the generated `AGENTS.md`; it's the same guide as this skill.)
     For a **one-off before any project exists**, run
     `bunx @damatjs/damat-cli module init <name>` — the `damat` bin only exists
     once `@damatjs/damat-cli` is installed, so `bunx damat …` 404s (there is no
     npm package named `damat`).
2. **Implement**, importing each symbol from its real package:
   ```ts
   import { defineModule, ModuleService } from "@damatjs/services";
   import { getModule } from "@damatjs/framework";
   import { model, columns, collectModels } from "@damatjs/orm-model";
   import { createStep, createWorkflow, executeStep, Effect } from "@damatjs/workflow-engine";
   import { z } from "@damatjs/deps/zod";
   ```
   - `src/models/` — model definitions (the `@damatjs/orm-model` DSL). Reference
     relations **inside your own module** by table name
     (`columns.belongsTo("accounts")`). Do **not** reference another module's
     tables — that's a cross-module link, which the app declares, not you.
   - `src/service.ts` — `export const models = collectModels([ModelA, ModelB])`
     (keys derived from each table name), then `export class XService extends
     ModuleService({ models, credentialsSchema })`. The generated CRUD is already
     there — add **only** new model-specific integrations (in `src/lib/`), never a
     method that re-exports `find`/`create`/etc. Business logic lives in the
     generated steps/workflows, not the service. **For plain CRUD the body stays
     empty (`{}`) and there is no `lib/gateway`** — only add a gateway + a one-line
     delegate for real category-D logic (see the hard rules above).
   - `src/config/` — a zod `schema` and a `load(env)` credentials loader.
   - `src/index.ts` — `defineModule(MODULE_ID, { service, credentials: load })`.
     The `ModuleRegistry` merge that makes `getModule("<name>")` typed is
     generated into `src/types/registry.ts` by codegen (no `accessor.ts`).
3. **Migrate + codegen:** `bun run migration:create`, then `bun run codegen` —
   regenerates types/zod/`registry.ts` AND scaffolds (once) the route → workflow →
   step CRUD slice from your models. Extend the generated files; don't recreate them.
4. **Test in isolation** with the harness (needs `DATABASE_URL`, no server):
   ```ts
   import { withModule } from "@damatjs/module";
   await withModule(mod, { moduleDir: … }, async ({ service }) => { /* ... */ });
   ```
5. **Make it portable:** fill in `src/module.json` (`name`, `version`, `env`,
   `packages`, `registry`). Keep it self-contained: prefer the non-binding
   `pairsWith` hint over declaring `modules` hard dependencies:
   ```jsonc
   { "name": "user-management", "pairsWith": ["user"] }
   ```
6. **Validate:** `bun run validate` until there are **no warnings** — registry-ready.

## Stay in your lane (the blade)

- ❌ Don't `defineLink`, create `src/links/`, or import another module — links and
  composition are an **app** concern (the `damat-backend` skill). The
  `@damatjs/module` surface deliberately does **not** expose link helpers.
- ❌ Don't decide what gets plugged in or what's "needed." That's the backend
  owner's call.
- ✅ Do one thing well, expose clean models + service, and leave a `pairsWith`
  hint if it pairs naturally with something.

## Guardrails

- Confirm before `--force` (overwrites an existing module).
- In isolation the harness applies your migrations for tests; in a real app the
  schema isn't live until the **backend owner** runs `damat-orm migrate:up`.
- Installing, wiring, linking, or composing modules into an app → switch to the
  **damat-backend** skill.
