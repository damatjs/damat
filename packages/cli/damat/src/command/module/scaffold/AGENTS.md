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
    ├── accessor.ts       # a typed getModule("<name>") helper
    ├── config/
    │   ├── schema/index.ts  # zod schema for this module's credentials
    │   ├── load.ts          # read credentials from env
    │   └── index.ts         # default export { schema, load }
    ├── models/           # ORM model definitions (your tables)
    ├── migrations/       # SQL migrations (generated)
    ├── workflows/        # optional saga workflows
    └── api/routes/       # optional file-based HTTP routes
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

Import everything from a **single** package — `@damatjs/module`:

```ts
import { defineModule, ModuleService, model, columns, z } from "@damatjs/module";
```

It also re-exports the workflow helpers (`createStep`, `createWorkflow`,
`executeStep`, …) and route types (`RouteHandler`). It **deliberately does not**
expose cross-module link helpers — links are an app concern, never a module's.

## Building the module

### 1. Models (`src/models/`)
Use the `@damatjs/orm-model` DSL (re-exported as `model` / `columns`). Reference
relations only to your **own** tables, by table name. Never reference another
module's tables — that would be a cross-module link, which only the app declares.

```ts
import { model, columns } from "@damatjs/module";

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
`this.transaction(cb)`. Add your domain methods on top.

```ts
import { ModuleService } from "@damatjs/module";
import { schema } from "./config/schema";
import { Widget } from "./models/widget";

export const models = { widget: Widget };

export class WidgetService extends ModuleService({ models, credentialsSchema: schema }) {
  byName(name: string) {
    return this.widget.find({ where: { name } });
  }
}
```

### 3. Config / credentials (`src/config/`)
`schema/index.ts` is a zod schema for the config your module needs; `load.ts`
reads it from `process.env`; `index.ts` exports `{ schema, load }`. Declare any
env vars in `src/module.json`'s `env` array so installers know to set them.

```ts
// src/config/schema/index.ts
import { z } from "@damatjs/module";
export const schema = z.object({ apiKey: z.string().min(16) });
export type schemaType = z.infer<typeof schema>;

// src/config/load.ts
export const load = (env: NodeJS.ProcessEnv) => ({ apiKey: env.WIDGET_API_KEY ?? "" });
```

### 4. Entry (`src/index.ts`)
Wires the service + credentials into a module definition. The scaffold also
augments `ModuleRegistry` so `getModule("<name>")` is typed, and `src/accessor.ts`
gives a typed accessor function.

```ts
import { defineModule } from "@damatjs/module";
import { WidgetService, models } from "./service";
import credentials from "./config";

export const MODULE_ID = "widget";
export { WidgetService, models };

declare module "@damatjs/services" {
  interface ModuleRegistry { widget: WidgetService }
}

export default defineModule(MODULE_ID, {
  service: WidgetService,
  credentials: credentials.load,
});
```

### 5. Migrate + generate types
After changing models: `bun run migration:create`, review the SQL, then
`bun run codegen`.

### 6. Workflows & routes (optional)
Saga workflows go in `src/workflows/` (`createStep` / `createWorkflow` /
`executeStep` inside `Effect.gen`, with compensation). File-based HTTP routes go
in `src/api/routes/**/route.ts` exporting `GET`/`POST`/… as `RouteHandler`.

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
  owner) — the `@damatjs/module` surface intentionally omits link helpers.
- ❌ Don't decide what is "needed" or what plugs into what.
- ✅ Do one thing well, expose clean models + a service, and — if it pairs
  naturally with something — leave a `pairsWith` hint.

## Conventions

- Bun only; ESM; strict TypeScript.
- Import the authoring surface from `@damatjs/module`; the ORM DSL is
  `model` / `columns`; validation is `z` (both from `@damatjs/module`).
- `ModuleService({ models, credentialsSchema })` — object args, not positional.
- Relations reference the **target table name**, and only your own tables.
- For the full API, read the `@damatjs/module` and `@damatjs/orm-model` package
  READMEs (in `node_modules/@damatjs/…`).
