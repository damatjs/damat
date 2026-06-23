# AGENTS.md — building this Damat module

This repository is a **standalone Damat module**: a single, self-contained,
shareable feature (models + service + config + migrations, and optionally
workflows + HTTP routes) that any Damat app can install with one command. You are
working on **this one module**.

> **The rule that shapes everything: a module is a single-purpose blade.** It does
> one thing well and stays independent. It must **not** define cross-module links,
> import another module, or decide what it is plugged into or what it "needs". If
> it pairs naturally with another module, leave a **non-binding `pairsWith` hint**
> in `src/module.json` — the *backend owner* who installs it decides composition.
> Building the app (links, wiring, what to combine) is their job; building the
> blade is yours.

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
    ├── lib/              # third-party SDK code (one file per provider, e.g. lib/stripe.ts) — called by the service
    ├── utils/            # small pure helpers (one concern per file)
    ├── workflows/        # GENERATED per-operation steps + callable workflows (scaffold-once — edit freely)
    └── api/routes/       # GENERATED routes, split into api/validator/query/middleware/route (scaffold-once)
└── tests/contract.test.ts
```

## Commands

```bash
bun run dev               # run the module standalone (its own server + DB)
bun run migration:create  # diff models -> a SQL migration in src/migrations
bun run codegen           # generate row types + zod schemas
bun run validate          # check the module.json contract + registry-readiness
bun run typecheck         # tsc --noEmit
bun test                  # the contract test + your own tests
```

---

## The build flow — basics first, then the rest

A module is **codegen-first**. You do **not** hand-write CRUD. The fast path:

1. **Model the data** — one table per file in `src/models/`.
2. **`bun run codegen`** — from your models it generates the WHOLE basic slice:
   `src/types/` (row types + zod + `registry.ts` that types `getModule`) and,
   **scaffold-once**, the per-operation `src/workflows/<table>/` (steps +
   workflows) and `src/api/routes/<table>/` (split route files). That is your
   working foundation — route → workflow → step → service, already wired.
3. **Build the rest ON TOP** of what codegen made: put real logic in the
   generated steps (each ships a compensation/fallback hook), add custom
   non-CRUD workflows/steps next to the generated ones, add third-party
   integrations on the service (SDK code in `src/lib/`), and pure helpers in
   `src/utils/`.
4. **Re-run `codegen`** after any model change — types/registry are overwritten;
   your step/workflow/route edits are kept (scaffold-once).

So: **models → codegen → extend.** Never reproduce CRUD by hand, and never create
a parallel route/step/workflow that competes with the generated one — extend it.

## Hard rules — never break these (so the code always "fits")

- **Layering is one-way: API route → workflow → step → service.**
  - A **route** ONLY calls a workflow (`await workflow.execute(input)`) and shapes
    the response. It NEVER calls the service, NEVER holds business logic.
  - Only a **step** touches the service, via the typed `getModule("<name>")`.
  - **Business logic + orchestration live in steps/workflows** — never in a route,
    never in the service.
- **The service is data + integrations ONLY** — the generated CRUD plus
  third-party calls (do/reverse pairs). No business logic, no orchestration.
- **No big files.** Split by concern: one model per file, one integration per
  `src/lib/<provider>.ts`, one helper-group per `src/utils/<concern>.ts`. The
  moment a file holds more than one idea, split it.
- **Import from the real packages** (see below), never the `@damatjs/module`
  umbrella.
- **Stay a blade:** no cross-module links, no importing another module.

## Where each kind of code goes

| You are adding… | It goes in… | Notes |
|---|---|---|
| a table | `src/models/<name>.ts` | one model per file |
| CRUD (create / find / update / delete / list) | **GENERATED — don't hand-write** | `codegen` scaffolds the steps/workflows/routes |
| business logic / orchestration | the generated `src/workflows/<table>/` steps & workflows (and your own custom ones) | steps call the service; workflows orchestrate steps |
| a third-party SDK (Stripe, AI provider, …) | `src/lib/<provider>.ts`, surfaced on the **service** as do/reverse methods | the service is the ONLY place integrations live |
| pure helpers / formatting / mappers | `src/utils/<concern>.ts` | small, one concern per file |
| the HTTP surface | **GENERATED** `src/api/routes/<table>/` — handlers ONLY call workflows | never call the service from a route |

## The authoring surface

Import each symbol from its **real** package — so the code fits unchanged when an
app pulls the module in:

```ts
import { defineModule, ModuleService } from "@damatjs/services";
import { getModule } from "@damatjs/framework";
import { model, columns, collectModels } from "@damatjs/orm-model";
import { createStep, createWorkflow, executeStep, Effect } from "@damatjs/workflow-engine";
import type { RouteHandler, RouteValidator } from "@damatjs/framework/router";
import { z } from "@damatjs/deps/zod";
```

`@damatjs/module` itself now carries only the contract/config/runtime/tooling
(`defineModuleConfig`, `bootModule`/`withModule`, `validateModuleDir`, …). Cross-
module link helpers are deliberately absent everywhere in the authoring surface —
links are an app concern, never a module's.

## Building the module

### 1. Models (`src/models/`)
Use the `@damatjs/orm-model` DSL (`model` / `columns`). Reference
relations only to your **own** tables, by table name. Never reference another
module's tables — that would be a cross-module link, which only the app declares.

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

The service is the **data + integration layer only**: bare CRUD plus any
third-party integration (Stripe, etc.) — the SDK import and its calls live here
(in `src/lib/<integration>.ts`), as a do/reverse pair so steps can compensate.
Business logic does **not** live here; it lives in steps/workflows
(route → workflow → step → service).

```ts
import { ModuleService } from "@damatjs/services";
import { collectModels } from "@damatjs/orm-model";
import { schema } from "./config/schema";
import { Widget } from "./models/widget";

export const models = collectModels([Widget]);   // -> { widgets: Widget }

export class WidgetService extends ModuleService({ models, credentialsSchema: schema }) {
  // Third-party integrations only — split each into ./lib/<integration>.ts:
  //   import { charge, refund } from "./lib/stripe";
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
`src/workflows/<table>/{steps,workflows}/…` and split routes under
`src/api/routes/<table>/…` — **scaffold-once** (your edits survive). The layering
is route → workflow → step → service. A single-step workflow is just
`(input, ctx) => myStep(input, ctx)` (steps are directly callable); for
multi-step, compose them in `Effect.gen` with `yield* myStep(input, ctx)`. Only
steps touch the service, via the typed `getModule("<name>")`. Add custom
(non-CRUD) workflows alongside the generated ones.

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

Run `bun run validate` until it reports **no warnings** — then it's
registry-ready. Publish to your registry, or just push to git / keep it local; an
app installs it with `damat module add <ref | path | git-url>`.

---

## Stay in your lane (the blade)

- ❌ No cross-module links, no `defineLink`, no `src/links/`, no importing another
  module. Links and composition belong to the **consuming app** (the backend
  owner) — the module authoring surface intentionally omits link helpers.
- ❌ Don't decide what is "needed" or what plugs into what.
- ✅ Do one thing well, expose clean models + a service, and — if it pairs
  naturally with something — leave a `pairsWith` hint.

## Conventions

- Bun only; ESM; strict TypeScript.
- Import each symbol from its real package: `defineModule`/`ModuleService` from
  `@damatjs/services`, `getModule` from `@damatjs/framework`, `model`/`columns`
  from `@damatjs/orm-model`, the workflow helpers from `@damatjs/workflow-engine`,
  `RouteHandler`/`RouteValidator` from `@damatjs/framework/router`, and `z` from
  `@damatjs/deps/zod`.
- `ModuleService({ models, credentialsSchema })` — object args, not positional;
  build `models` with `collectModels([...])` (keys derived from table names);
  keep the service CRUD + integrations only.
- Relations reference the **target table name**, and only your own tables.
- For the full API, read the package READMEs (in `node_modules/@damatjs/…`).
- Keep files small and readable — split, don't pile into one big file.
