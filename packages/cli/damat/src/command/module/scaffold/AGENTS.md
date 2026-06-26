# AGENTS.md — building this Damat module

This repository is a **standalone Damat module**: a single, self-contained,
shareable feature (models + service + config + migrations, and optionally
workflows + HTTP routes) that any Damat app can install with one command. You are
working on **this one module**.

> **The rule that shapes everything: a module is a single-purpose blade.** It does
> one thing well and stays independent. It must **not** import another module's code
> or decide what it is plugged into or what it "needs". If it pairs naturally with
> another module, leave a **non-binding `pairsWith` hint** in `src/module.json`. It
> MAY also ship a **dormant link file** under `src/links/` (a `defineLink` the
> *backend owner* activates by migrating) — but it never imports the other module and
> never creates the connection itself. Building the app (what to combine, when to
> activate links) is their job; building the blade is yours.

---

## Prerequisites

- **Bun** — this is a Bun project. Use `bun` / `bunx`, never npm/yarn/pnpm.
  Run `bun install` first.
- A **PostgreSQL** URL in `.env` (`DATABASE_URL=…`) to run the module or to run
  database-backed tests. Copy `.env.example` to `.env`.
- The `damat` CLI comes from the `@damatjs/damat-cli` dev dependency; the
  package's scripts wrap it, so you normally run `bun run <script>`.

## Layout

```
.
├── package.json          # @modules/<name>; scripts wrap the damat CLI
├── tsconfig.json
├── module.config.ts      # defineModuleConfig — module-local runtime config
├── .env.example          # DATABASE_URL
└── src/
    ├── module.json       # the portable contract (name, version, env, registry, pairsWith)
    ├── index.ts          # defineModule(...) — the module's public definition
    ├── service.ts        # ModuleService({ models, credentialsSchema }); models = collectModels([...])
    ├── config/
    │   ├── schema/index.ts  # zod schema for this module's credentials
    │   ├── load.ts          # read credentials from env
    │   └── index.ts         # default export { schema, load }
    ├── models/           # ORM model definitions (your tables)
    ├── migrations/       # SQL migrations (generated)
    ├── types/            # GENERATED (overwritten each run): row types + zod + registry.ts — don't hand-edit
    ├── lib/              # everything the service calls: providers (one per file), pure helpers in
    │                     #   lib/utils/, category-D gateway ops — there is NO top-level src/utils/
    ├── workflows/        # GENERATED, flat <table>/{steps,workflows} + index.ts barrels (scaffold-once — edit freely)
    └── api/routes/       # GENERATED routes, flat <table>/, split into api/validator/query/middleware/route (scaffold-once)
└── tests/contract.test.ts
```

## Commands

```bash
bun run dev               # run the module standalone (its own server + DB)
bun run migration:create  # diff models -> a SQL migration in src/migrations
bun run codegen           # generate row types + zod schemas
bun run validate          # check the module.json contract + registry-readiness
bun run typecheck         # tsc --noEmit
bun run build             # type-check + contract validate (the release gate)
bun test                  # the contract test + your own tests
```

---

## The build flow — codegen is your propeller, build only what's missing

A module is **codegen-first**. You do **not** hand-write CRUD. The fast path:

1. **Model the data** — one table per file in `src/models/`.
2. **`bun run codegen`** — from your models it generates the WHOLE basic slice:
   `src/types/` (row types + zod + `registry.ts` that types `getModule`) and,
   **scaffold-once**, the per-operation `src/workflows/<table>/` (steps +
   workflows) and `src/api/routes/<table>/` (split route files) — both flat by
   table; `damat module add` adds the `<moduleId>/` segment on install. That is your
   working foundation — route → workflow → step → service, already wired.
3. **Build only what's missing ON TOP** of what codegen made: put real logic in
   the generated steps (each ships a compensation/fallback hook), add custom
   non-CRUD workflows/steps next to the generated ones, add third-party
   integrations on the service (SDK code in `src/lib/`), and pure helpers in
   `src/lib/utils/`.
4. **Re-run `codegen`** after any model change — types/registry are overwritten;
   your step/workflow/route edits are kept (scaffold-once).

So: **models → codegen → extend.** The generated slice is your propeller — extend
it in place. Never reproduce CRUD by hand, and never create a parallel
route/step/workflow that competes with the generated one — extend it.

## Hard rules — never break these (so the code always "fits")

- **Layering is one-way: API route → workflow → step → service.**
  - A **route** ONLY calls a workflow (`await workflow.execute(input)`) and shapes
    the response. It NEVER calls the service, NEVER holds business logic.
  - Only a **step** touches the service, via the typed `getModule("<name>")`.
  - **The step does the work with the scaffolded CRUD accessors directly**
    (`getModule("<name>").<table>.create/update/find/…`) and owns its compensation. If a
    step can do the action with a handful of accessor calls and undo them itself, it is NOT
    a service/gateway function — the step just calls the accessors. A **service method**
    (a one-line delegate to a `src/lib/gateway` body) is reserved for logic **beyond CRUD** —
    a third-party API call, or a genuinely-complex many-table operation — and the gateway is
    imported **only** by the service. Never wrap an accessor in a second function (no
    `recordEvent` over `eventEvents.create`). The step owns the **revert**.
- **Never re-wrap what the service already gives you.** `ModuleService({ models })`
  already exposes the full per-model CRUD surface — `create`, `createMany`, `upsert`,
  `upsertMany`, `find`, `findById`, `findOne`, `findMany`, `update`, `updateOne`,
  `delete` / `softDelete` (with `cascade`), `restore`, `count`, `exists`. NEVER add a
  service method that just forwards to one of these — no `getUser` that calls `find`,
  no `listUsers` that calls `findMany`. A step calls
  `getModule("<name>").<model>.find(...)` (etc.) **directly**. The service gains
  **only new, model-specific** logic the generated CRUD can't do — e.g. an `ai`
  model's provider calls: the provider catalog + request/parse detail lives in
  `src/lib/<provider>.ts`, and the service method just selects the provider and
  invokes it (then may persist via the accessor). Litmus test: if a method body is a
  single CRUD call, delete it and call the accessor from the step.
- **The service stays small — logic lives in `src/lib/`.** It is data + new
  integrations ONLY (the generated CRUD plus third-party calls as do/reverse pairs),
  mostly **one-line delegates** to `src/lib/` functions. No business logic, no
  orchestration, no CRUD passthroughs. There is no top-level `src/utils/`.
- **No file over 100 lines. Readability is the highest priority.** Split by concern:
  one model per file, one integration per `src/lib/<provider>.ts`, one helper-group
  per `src/lib/utils/<concern>.ts`. The moment a file holds more than one idea — or
  crosses ~100 lines — split it; extract a long function's sub-steps into sibling
  files/folders so each piece reads on its own. A long file is a refactor signal,
  never a "comment it better" one.
- **Import from the real packages** (see below), never the `@damatjs/module`
  umbrella.
- **Stay a blade:** never import another module's code. You MAY ship a **dormant
  link file** under `src/links/` (see "Shipping a link" below) — it creates nothing
  until the backend owner migrates it.

## Where each kind of code goes

| You are adding… | It goes in… | Notes |
|---|---|---|
| a table | `src/models/<name>.ts` | one model per file |
| CRUD (create / find / update / delete / list) | **GENERATED — don't hand-write** | `codegen` scaffolds the steps/workflows/routes |
| business logic / orchestration | the generated `src/workflows/<table>/` steps & workflows (and your own custom ones) | steps call the service; workflows orchestrate steps |
| a third-party SDK (Stripe, AI provider, …) | `src/lib/<provider>.ts`, surfaced on the **service** as do/reverse methods | the service is the ONLY place integrations live |
| pure helpers / formatting / mappers | `src/lib/utils/<concern>.ts` | small, one concern per file (no top-level `src/utils/`) |
| the HTTP surface | **GENERATED** `src/api/routes/<table>/` — handlers ONLY call workflows | never call the service from a route |
| an optional dormant link | `src/links/models/<from>-<to>.ts` (`defineLink`) | hand-written; splits into the app's `src/links/<moduleId>/` on install; ships no migration (see "Shipping a link") |

## The authoring surface

Import each symbol from its **real** package — so the code fits unchanged when an
app pulls the module in:

```ts
import { defineModule, ModuleService } from "@damatjs/services";
import { getModule } from "@damatjs/framework";
import { model, columns, collectModels } from "@damatjs/orm-model";
import { createStep, createWorkflow, Effect } from "@damatjs/workflow-engine";
import type { RouteHandler, RouteValidator } from "@damatjs/framework/router";
import { z } from "@damatjs/deps/zod";
```

`@damatjs/module` itself now carries only the contract/config/runtime/tooling
(`defineModuleConfig`, `bootModule`/`withModule`, `validateModuleDir`, …) — it does
**not** re-export link helpers. To ship a dormant link, import `defineLink` /
`collectLinkModels` from `@damatjs/framework` (the same surface the app uses) in a
`src/links/models/<a>-<b>.ts` file. See "Shipping a link" below.

### Portable import aliases (use exactly what codegen emits)

Your imports must resolve **identically** standalone here AND after `damat module add`
inserts `src/` into a host app. The host keeps some parts inside the module dir and
moves others out, so two `tsconfig.json` aliases split by destination:

- **Stay-inside → `@<module>/*`** — `types`, `config`/`schema`, `service`, `lib`, and
  `models` stay under `src/modules/<module>/`. Address them by the module-name alias:
  ```ts
  import type { Widgets } from "@widget/types";
  import { schema } from "@widget/config/schema";
  import type { WidgetService } from "@widget/service";
  ```
  Types stay inside — they are never moved out.
- **Move-out → the bare `@workflows` barrel** — `workflows/` and `api/routes/`
  relocate into the app's top-level `src/workflows/` / `src/api/routes/` on install.
  Your module ships both trees **FLAT** (`workflows/<table>`, `api/routes/<table>`); the
  `<moduleId>/` segment is added by `damat module add`, never by your codegen. Because the
  folder is flat, you don't reference workflows by a deep path — you reach them through the
  recursive `index.ts` barrels, where the bare barrel root `@workflows` re-exports every
  workflow:
  ```ts
  // route → workflow (crosses trees) — from the barrel root:
  import { createWidgetsWorkflow } from "@workflows";
  // workflow → step (same <table> subtree, relocates together) — relative:
  import { createWidgetsStep } from "../steps/createWidgets";
  ```
  `@workflows` resolves to `src/workflows/index` the same standalone and after install
  (tsconfig has a non-wildcard `"@workflows": ["./src/workflows"]` entry), so it is
  install-stable with no module-id baked into the specifier. Barrels are auto-generated
  (codegen, `damat module add`, or `damat barrel`) — **never hand-edit an `index.ts` barrel;
  add the file and re-run.**
- **Never use `@/` in module code.** The host binds `@/` → the *app* root, so a moved-out
  file importing `@/types` would silently resolve to the app's `src/types`, not yours.
- **Sibling re-exports stay relative** (`./api`, `./create<Pascal>`, `./validator`,
  `../steps/<op>`) — files that always move together keep relative paths.
- The **only** cross-module specifier you'll see is in codegen-generated link augmentation
  (`<table>.links.ts`), which imports the linked module's types via `@<other>/types` — you
  never hand-write it.

Codegen emits these specifiers for you. When you **hand-write** a file, use the SAME
specifiers codegen emits — reach workflows via the bare `@workflows` barrel, a step
via its relative `../steps/<op>` sibling, and types via `@<module>/types`; don't
invent a new alias.

## Building the module

### 1. Models (`src/models/`)
Use the `@damatjs/orm-model` DSL (`model` / `columns`). Reference
relations only to your **own** tables, by table name. Never reference another
module's tables in a model relation — a cross-module connection is a separate,
dormant **link file** (see "Shipping a link"), never a model relation.

```ts
import { model, columns } from "@damatjs/orm-model";

export const Widget = model("widgets", {
  id: columns.id({ prefix: "wgt" }).primaryKey(),
  name: columns.text(),
  ownerId: columns.text(),          // a plain id, NOT a foreign key to another module
}).indexes([columns.indexes().columns(["name"])]).timestamps();
```

Register every model in `src/service.ts`'s `models` map.

### 2. Service (`src/service.ts`)
`ModuleService({ models, credentialsSchema })` auto-generates CRUD for each model
(keyed by its map name): `create` / `createMany` / `upsert` / `upsertMany` /
`find` / `findById` / `findOne` / `findMany` / `update` / `updateOne` / `delete`
(optional `cascade`) / `softDelete` (optional `cascade`) / `restore` / `count` /
`exists`, plus `this.transaction(cb)`.

**Pass models as an ARRAY via `collectModels`** — it derives each accessor key
from the model's TABLE NAME (camelCased, no pluralizing), so you never hand-write
a redundant key: `model("items")` → `service.items`, `model("ai_sessions")` →
`service.aiSessions`. The codegen scaffolder wires generated steps to
`service.<camelTable>`, so the key (= table name) is the single source of truth.

The service is the **data + new-integration layer only**. The CRUD above is
already generated — **never add a method that re-exports it** (no `getWidget`
wrapping `find`, no `listWidgets` wrapping `findMany`); steps call
`service.<model>.find(...)` directly. The service gains **only new, model-specific**
methods the CRUD can't do — third-party calls where the SDK import + provider
detail live in `src/lib/<provider>.ts` and the method just selects and invokes
the provider (do/reverse pairs so steps can compensate). Business logic does
**not** live here; it lives in steps/workflows (route → workflow → step → service).

**Empty-gateway baseline.** A plain-CRUD module has **no service methods and no
`lib/gateway`** — `ModuleService({ models })` already covers every operation, so the empty
body below **is** the finished service, not an unfinished one. The step does CRUD-shaped
work with the accessors directly. Add a `lib/gateway` function (taking the service as its
first arg) plus a **one-line** service delegate ONLY for logic **beyond CRUD** — a
third-party API call, or a genuinely-complex operation touching many tables. The body lives
in `lib/gateway`, imported **only** by the service; the step calls `service.method(...)`.
Never wrap an accessor in a second function (no `recordEvent` over `eventEvents.create`).
"Every exemplar has a gateway, so I must invent one" is the failure to avoid — see
`spec/MODULE-STANDARDS.md`.

```ts
import { ModuleService } from "@damatjs/services";
import { collectModels } from "@damatjs/orm-model";
import { schema } from "@widget/config/schema";
import { Widget } from "@widget/models/widget";

export const models = collectModels([Widget]);   // -> { widgets: Widget }

export class WidgetService extends ModuleService({ models, credentialsSchema: schema }) {
  // Plain CRUD ⇒ leave this body EMPTY — that is the finished service, not a stub.
  // NO CRUD passthroughs — `service.widgets.find(...)` already exists; call it
  // from steps. Add ONLY new model-specific integrations, each in @widget/lib/<x>:
  //   import { charge, refund } from "@widget/lib/stripe";
  //
  // e.g. an `ai` model: providers + request/parse detail live in @widget/lib/<provider>;
  //   the method just picks the provider and calls it (then persists via the accessor):
  //   async complete(input) {
  //     const provider = pickProvider(this.credentials);   // @widget/lib/providers
  //     return provider.complete(input);                    // @widget/lib/<provider>
  //   }
}
```

### 3. Config / credentials (`src/config/`)
`schema/index.ts` is a zod schema for the config your module needs; `load.ts`
reads it from `process.env`; `index.ts` exports `{ schema, load }`. Declare any
env vars in `src/module.json`'s `env` array so installers know to set them.

```ts
// src/config/schema/index.ts
import { z } from "@damatjs/deps/zod";
export const schema = z.object({ apiKey: z.string().min(16) });
export type schemaType = z.infer<typeof schema>;

// src/config/load.ts
export const load = (env: NodeJS.ProcessEnv) => ({ apiKey: env.WIDGET_API_KEY ?? "" });
```

### 4. Entry (`src/index.ts`)
Wires the service + credentials into a module definition. The `ModuleRegistry`
augmentation that makes `getModule("<name>")` typed is **generated** into
`src/types/registry.ts` by codegen — you don't hand-author it (and there is no
`accessor.ts`; reach the service with the typed `getModule("<name>")`).

```ts
import { defineModule } from "@damatjs/services";
import { WidgetService, models } from "./service";
import credentials from "./config";

export const MODULE_ID = "widget";
export { WidgetService, models };

export default defineModule(MODULE_ID, {
  service: WidgetService,
  credentials: credentials.load,
});
```

### 5. Migrate + generate types
After changing models: `bun run migration:create`, review the SQL, then
`bun run codegen`.

### 6. Workflows & routes (generated)
`bun run codegen` scaffolds a per-operation CRUD slice from your models —
`src/workflows/<table>/{steps,workflows}/…` (flat by table; the `<moduleId>/`
segment is added on install — see *Portable import aliases* above) and split routes
under `src/api/routes/<table>/…` — **scaffold-once** (your edits survive). The layering
is route → workflow → step → service. A single-step workflow is just
`(input, ctx) => myStep(input, ctx)` (steps are directly callable); for
multi-step, compose them in `Effect.gen` with `yield* myStep(input, ctx)`
(`yield*` is just Effect's `await` — it runs the step and binds its result).
A step takes an optional third arg to override retry/timeout for that one call —
`myStep(input, ctx, { timeoutMs: 15_000, retry: { maxAttempts: 3 } })` — layered
over the step's own `createStep(..., { timeoutMs, retry })` defaults. Only steps
touch the service, via the typed `getModule("<name>")`. Add custom (non-CRUD)
workflows alongside the generated ones.

A route ONLY calls a workflow — never the service, never business logic:

```ts
// ✅ api.ts — the route just calls the workflow and shapes the response
export const POST: RouteHandler = async (c) => {
  const result = await createWidgetsWorkflow.execute(await c.req.json());
  if (!result.success) return c.json({ success: false, error: result.error?.message }, 500);
  return c.json({ success: true, data: result.result }, 201);
};

// ❌ NEVER do this in a route — no getModule/service, no business logic here
export const POST: RouteHandler = async (c) => {
  const svc = getModule("widget");                 // ❌ route reaching the service
  if (await svc.widgets.find(/* … */)) { /* ❌ logic */ }
  return c.json(await svc.widgets.create({ data: await c.req.json() })); // ❌
};
```

On install the app's `damat module add` relocates each resource into the app's
own `src/api/routes` / `src/workflows`.

---

## The `module.json` contract (`src/module.json`)

This is what makes the module installable and discoverable.

| Field | Type | Notes |
|-------|------|-------|
| `name` | string (required) | module id; kebab-case (`widget`, `user-management`). |
| `version` | string | semver; required to publish to a registry. |
| `description` | string | shown on install and in the registry. |
| `author` | string \| object | `"Name <email> (url)"` or `{ name, email?, url? }`. |
| `env` | `{ name, required?, description?, example? }[]` | env vars; drives `.env.example` sync. |
| `packages` | `Record<string,string>` | npm deps the host app installs. |
| `pairsWith` | `string[]` | **Non-binding** hint: modules this one pairs well with. A comment for the backend owner — never enforced or installed. **Prefer this** to express relationships. |
| `paths` | object | layout overrides (`entry`/`models`/`migrations`/`workflows`/`types`). |
| `registry` | object | `namespace`, `keywords`, `license`, `repository`, `homepage`. |

**Do not** add a `modules` (hard dependency) array unless it is genuinely
unavoidable — a module should stay self-contained. To suggest a relationship, use
`pairsWith`; the backend owner decides what to actually install and link.

```jsonc
{
  "name": "user-management",
  "version": "0.1.0",
  "description": "Workspaces, teams, and memberships.",
  "env": [{ "name": "API_KEY_SECRET", "required": true, "example": "min-16-chars" }],
  "pairsWith": ["user"],          // hint only — not a dependency
  "registry": { "namespace": "you", "license": "MIT", "keywords": ["teams"] }
}
```

## Testing

`tests/contract.test.ts` validates the `module.json` contract. For behavior, use
the harness — no app or server needed:

```ts
import { describe, expect, test } from "bun:test";
import { withModule } from "@damatjs/module";
import mod from "../src";

describe.skipIf(!process.env.DATABASE_URL)("widget", () => {
  test("creates a widget", async () => {
    await withModule(mod, { moduleDir: new URL("../src", import.meta.url).pathname }, async ({ service }) => {
      const w = await service.widgets.create({ data: { name: "a" } });
      expect(w.name).toBe("a");
    });
  });
});
```

Harness tests need `DATABASE_URL`; gate them with `describe.skipIf(...)`. Test one
module per process.

## Validate, then share

Run `bun run build` — it **type-checks** the module (`tsc --noEmit`) and runs the
contract **validate** in one gate; it must exit clean. Keep going until `validate`
reports **no warnings** too — then it's registry-ready. Publish to your registry,
or just push to git / keep it local; an app installs it with
`damat module add <ref | path | git-url>`.

---

## Stay in your lane (the blade)

- ❌ Never import another module's code, and never activate a connection yourself.
- ❌ Don't decide what is "needed" or what plugs into what.
- ✅ Do one thing well, expose clean models + a service, and — if it pairs
  naturally with something — leave a `pairsWith` hint.
- ✅ You MAY ship a **dormant** `defineLink` under `src/links/models/` — it proposes
  a connection but creates nothing until the **backend owner** migrates it (see
  "Shipping a link").

## Shipping a link (optional)

Most modules ship no links. If yours genuinely pairs with another (e.g. `user` ↔
`organization`), you can ship the connection as a **dormant** link file instead of
leaving the owner to hand-write it:

- Put a `defineLink(...)` in `src/links/models/<from>-<to>.ts`, importing from
  `@damatjs/framework`. Name your **own** side concretely and the target by the
  module id you expect (the owner edits it if they installed that module under a
  different id):
  ```ts
  import { defineLink } from "@damatjs/framework";
  export default defineLink(
    { module: "user", model: "users", field: "users" },          // your side
    { module: "organization", model: "organizations", field: "organizations" }, // target
  );
  ```
- **Ship no migration for it.** On `damat module add`, the file splits into the
  app's `src/links/<moduleId>/` and the owner index + top-level aggregator are
  regenerated. The link is **dormant** until the backend runs
  `damat-orm migrate:create link:<moduleId>` + `migrate:up`, and **inert** until
  queried — so it's harmless even if the target module isn't installed.
- You never import the other module's code, and you never create the connection —
  the backend owner stays in control of whether and when to activate it.

## Conventions

- Bun only; ESM; strict TypeScript.
- Import each symbol from its real package: `defineModule`/`ModuleService` from
  `@damatjs/services`, `getModule` from `@damatjs/framework`, `model`/`columns`
  from `@damatjs/orm-model`, the workflow helpers from `@damatjs/workflow-engine`,
  `RouteHandler`/`RouteValidator` from `@damatjs/framework/router`, and `z` from
  `@damatjs/deps/zod`.
- `ModuleService({ models, credentialsSchema })` — object args, not positional;
  build `models` with `collectModels([...])` (keys derived from table names). Keep
  the service to the generated CRUD + **new** integrations only — never re-export a
  CRUD method (call `service.<model>.find(...)` from the step instead).
- Relations reference the **target table name**, and only your own tables.
- For the full API, read the package READMEs (in `node_modules/@damatjs/…`).
- **No file over 100 lines; readability is the highest priority.** Split by concern,
  subdivide long functions into sibling files/folders — never pile into one big file.
