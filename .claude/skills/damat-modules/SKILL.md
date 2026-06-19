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

1. **Start the module** — two ways, same resulting shape:
   - `bunx create-damat-app@latest <name> --module` — clones the
     `damatjs/damat-starter-module` repo (the full starter: README, AGENTS.md, CI,
     tests). Same flow as creating a backend; needs network.
   - `damat module init <name>` — an offline local scaffold (`package.json`
     scripts, `module.config.ts`, `src/index.ts`/`service.ts`/`accessor.ts`,
     `src/config/schema`, `src/module.json`, a contract test).
2. **Implement**, importing the authoring surface from `@damatjs/module`:
   ```ts
   import { defineModule, ModuleService, model, columns, z } from "@damatjs/module";
   ```
   - `src/models/` — model definitions (the `@damatjs/orm-model` DSL). Reference
     relations **inside your own module** by table name
     (`columns.belongsTo("accounts")`). Do **not** reference another module's
     tables — that's a cross-module link, which the app declares, not you.
   - `src/service.ts` — register models in the `models` map; `export class XService
     extends ModuleService({ models, credentialsSchema })` + your domain methods.
   - `src/config/` — a zod `schema` and a `load(env)` credentials loader.
   - `src/index.ts` — `defineModule(MODULE_ID, { service, credentials: load })`
     (plus a `ModuleRegistry` merge so `getModule()` is typed; `accessor.ts` wraps it).
3. **Migrate + codegen:** `bun run migration:create` then `bun run codegen`.
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
