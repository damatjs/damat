---
name: damat-backend
description: >-
  Build, operate, and ASSEMBLE a Damat backend app — add models/services/routes/
  workflows, run the dev server, run migrations, wire config, use Redis/logging,
  AND compose modules: install them, wire them into damat.config.ts, link two
  modules, and set up the module-install MCP. Use when working inside a Damat app
  (damat.config.ts + src/modules/). For AUTHORING a standalone shareable module,
  use the damat-modules skill. Triggers: "add an endpoint/model/service/migration/
  workflow", "run the damat app", "wire up config", "install a module", "link two
  modules", "compose modules", "set up the module MCP".
---

# Working in a Damat backend

This skill makes you effective at everyday development in a Damat app. A Damat
app is composed of **modules** (models + service + config + migrations +
workflows) registered in `damat.config.ts`, with **file-based routes** under
`src/api/routes/`. The framework wires it all at startup.

References in the repo (read when you need detail):
- `docs/GUIDE.md` and `docs/guide/` — the full step-by-step guide.
- `docs/guide/02-concepts.md` — the mental model (read this first if unsure).
- `AGENTS.md` — repo map, conventions, common-task recipes.
- `backend/default/` — a complete worked example; copy its patterns.
- `packages/link/README.md` — cross-module links (composition).
- `packages/mcp/README.md` — the module-install MCP server.
- `releases/<package>/` — per-package version history & upgrade notes. When you
  change a package, update both its living docs and `releases/` per
  `docs/DOCUMENTATION-STANDARD.md`.

## Ground rules

- **Bun only.** `bun install`, `bun run <script>`, `bun test`. Never npm/yarn/pnpm.
- **Imports:** app code imports `defineConfig`, `defineModule`, `ModuleService`,
  `getModule` from `@damatjs/framework`; route helpers (`RouteHandler`,
  `defineRoute`) from `@damatjs/framework/router`; models from
  `@damatjs/orm-model`. Use `@damatjs/deps/<lib>` (e.g. `@damatjs/deps/zod`)
  instead of importing `zod`/`hono`/`effect`/`pg`/`ioredis` directly. Cross-module
  link helpers (`defineLink`, `collectLinkModels`, `defineLinkModule`) also come
  from `@damatjs/framework`.
- **Cross-module relationships are links, not relations.** A `columns.hasMany(...)`
  relation is for tables *within one module*; to relate models across modules use
  a **link** in `src/links/` (see the task below).
- **`modules` in `damat.config.ts` is a keyed object** `{ id: { resolve, id } }`,
  not an array.
- **Schema changes are not live until migrated.** After any model change, run
  `damat-orm migrate:create <name>` then `damat-orm migrate:up`.
- Match the surrounding code; check `backend/default/` for the idiom before
  inventing one.

## Common tasks

### Add / change a model (table)
1. Edit or add a model in `src/modules/<m>/models/` using the orm-model DSL:
   `model("table", { col: columns.text()... }).indexes([...]).timestamps()`.
   Relations reference the **target table name** (`columns.hasMany("accounts")`).
2. Register it in the module's `service.ts` `models` map.
3. `damat-orm migrate:create <name>` → review the SQL → `damat-orm migrate:up`.
4. Optionally `damat-orm generate:types` to refresh row types.
Guide: `docs/guide/05-models.md`, `docs/guide/06-migrations.md`.

### Add business logic (service method)
Add a method to the module's `ModuleService` subclass. Use the generated
per-model CRUD (`this.<model>.create/find/update/...`) and `this.transaction(cb)`
for multi-write atomicity. Guide: `docs/guide/07-modules-and-services.md`.

### Add an HTTP endpoint
Create `src/api/routes/<path>/route.ts` exporting `GET`/`POST`/… as
`RouteHandler`, or `defineRoute<Params>` for typed dynamic segments
(`[param]` folders → `:param`). Reach data via `getModule("<id>")`. Put
cross-cutting concerns in `src/api/middleware/`. Guide: `docs/guide/08-http-apis.md`.

### Add a workflow (multi-step, must roll back)
Define steps with `createStep<I,O>(name, forward, compensation?, config?)` and
compose them with `createWorkflow` + `executeStep` inside `Effect.gen`. Run with
`.execute(input)` or `.executeWithLock(input, { lockId, ttlMs })`. Guide:
`docs/guide/09-workflows.md`.

### Relate two modules (cross-module link)
Modules stay decoupled and can't foreign-key into each other, so a many-to-many
relationship lives **outside** both modules under `src/links/<owner>/` (same shape
as a module: `models/`, `index.ts`, `migrations/`). An auto-generated junction
table stores it.
1. `src/links/<owner>/models/<a>-<b>.ts`:
   `export default defineLink({ module:"user", model:"user", field:"users" }, { module:"organization", model:"organization", field:"organizations" })`.
2. `src/links/<owner>/index.ts`: `export const links=[...]; export const models=collectLinkModels(links);`.
3. `src/links/index.ts`: aggregate owners, `export default defineLinkModule(links)`.
4. `damat.config.ts`: add `links: "./src/links"`.
5. `damat-orm migrate:create link:<owner>` → `damat-orm migrate:up` → `damat-orm generate:types <module>`.
6. Query at runtime via `getModule("link")`: `.create / .dismiss / .fetch / .graph`.
`defineLink`, `collectLinkModels`, `defineLinkModule` import from `@damatjs/framework`.
Details: `packages/link/README.md`.

### Install & compose modules (assemble the app)
You build the app by composing modules — installing and wiring is the backend
owner's job (a module never decides this for you). Prefer the MCP tools if the
`@damatjs/mcp` server is connected (`search_modules`, `module_info`, `add_module`,
`list_installed`); otherwise the CLI: `damat module add <registry-ref | ./path |
owner/repo | git-url>` → set new env in `.env` → `damat-orm migrate:up` → restart.
Check trust first (never a `rejected`/`revoked` module; respect
`DAMAT_MODULE_VERIFY`), and don't hand-edit `damat.config.ts` or copy files when
`add_module` / `damat module add` can do it. A module's `pairsWith` is only a
hint — you decide what's actually installed and linked. Guide:
`docs/guide/14-installing-modules.md`.

### Set up module install for AI (MCP)
`bun add -D @damatjs/mcp`, then add a `damat-modules` server to `.mcp.json` with
`DAMAT_MODULE_REGISTRY`, `DAMAT_APP_DIR`, and `DAMAT_CLI` in its `env`. Smoke-test
the installed bin: `printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | bunx damat-mcp`.
Guide: `docs/guide/15-installing-modules-with-ai.md`.

### Use Redis (cache / rate limit / lock / queue)
`initRedis(REDIS_URL)` once (the framework does this when `redisUrl` is set),
then `cacheGet/cacheSet`, `checkRateLimit`, `withLock`, `RedisQueue`, etc.
Guide: `docs/guide/10-redis.md`.

### Configure the app
Edit `damat.config.ts` (`projectConfig` + `modules`). New env vars go in `.env`
and `.env.example`. Guide: `docs/guide/04-configuration.md`.

## Run, test, debug

```bash
bun run dev          # damat dev — hot-reload server
bun run db:migrate   # damat-orm migrate:up
bun run db:status    # what's applied vs pending
bun test             # tests
bun run typecheck    # tsc --noEmit (if present)
```

When debugging boot failures, suspect **config/credentials validation first**
(a module's zod schema rejecting env) — the error names the failing field. For
DB issues, check `DATABASE_URL` and `damat-orm migrate:status`. For Redis
no-ops, check `REDIS_URL`.

## Authoring a standalone, shareable module?

Switch to the **`damat-modules`** skill — it covers building one self-contained
module (`damat module init/dev/migration:create/codegen/validate`, the
`module.json` contract, the isolation harness). Installing, linking, and composing
modules into *this* app stay here.

## Guardrails

- Don't hand-edit migrations that have already been applied; create a new one.
- Don't bypass config validation by reading `process.env` ad hoc inside modules
  — declare it in the module's credentials schema/loader.
- Confirm before destructive DB actions (revert in production, dropping tables).
- After schema changes, always tell the user (or run) `damat-orm migrate:up`.
