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
    ├── service.ts        # ModuleService({ models, credentialsSchema }) + the `models` map
    ├── config/
    │   ├── schema/index.ts  # zod schema for this module's credentials
    │   ├── load.ts          # read credentials from env
    │   └── index.ts         # default export { schema, load }
    ├── models/           # ORM model definitions (your tables)
    ├── migrations/       # SQL migrations (generated)
    ├── types/            # GENERATED: row types + zod + registry.ts (getModule typing can add custom but the one generated will be updated so avoid touching the generated once)
    ├── lib/              # any custom function or logic that needs to be running in the service should be here if a provider or third party api their code and setup is laid here and called in the service.ts
    ├── workflows/        # GENERATED CRUD steps + workflows (scaffold-once)
    └── api/routes/       # GENERATED CRUD routes, split into api/validator/query/middleware
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

## The authoring surface

Import each symbol from its **real** package — so the code fits unchanged when an
app pulls the module in:

```ts
import { defineModule, ModuleService } from "@damatjs/services";
import { getModule } from "@damatjs/framework";
import { model, columns } from "@damatjs/orm-model";
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
(keyed by its map name): `create` / `createMany` / `find` / `findMany` / `update`
/ `delete` / `softDelete` / `restore` / `count` / `exists`, plus
`this.transaction(cb)`.

**Register every model under the camelCase of its TABLE NAME** (no pluralizing) —
`model("items")` → `items`, `model("ai_sessions")` → `aiSessions`. The codegen
scaffolder wires generated steps to `service.<camelTable>`, so the key must match.

The service is the **data + integration layer only**: bare CRUD plus any
third-party integration (Stripe, etc.) — the SDK import and its calls live here,
as a do/reverse pair so steps can compensate. Business logic does **not** live
here; it lives in steps/workflows (route → workflow → step → service).

```ts
import { ModuleService } from "@damatjs/services";
import { schema } from "./config/schema";
import { Widget } from "./models/widget";

export const models = { widgets: Widget };

export class WidgetService extends ModuleService({ models, credentialsSchema: schema }) {
  // Third-party integrations only — split each into ./service/<integration>.ts:
  //   import { charge, refund } from "./service/stripe";
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
is route → workflow → step → service: a route calls a workflow, the workflow
orchestrates steps. A single-step workflow is just `(input, ctx) => myStep(input, ctx)`
(steps are directly callable); for multi-step, compose them in `Effect.gen` with
`yield* myStep(input, ctx)`. Only steps touch the service, via the typed
`getModule("<name>")`. Add custom (non-CRUD) workflows alongside the generated
ones. On install the app's `damat module add` relocates each resource into the
app's own `src/api/routes/<table>` and `src/workflows/<table>` (keyed by the
table name, the source of truth — not the module id).

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
      const w = await service.widget.create({ data: { name: "a" } });
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
  register models under their table name; keep it CRUD + integrations only.
- Relations reference the **target table name**, and only your own tables.
- For the full API, read the package READMEs (in `node_modules/@damatjs/…`).
- Keep files small and readable — split, don't pile into one big file.
