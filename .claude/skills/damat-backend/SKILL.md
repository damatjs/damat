---
name: damat-backend
description: >-
  Build and operate a Damat backend app — add models, services, routes, and
  workflows; run the dev server; create and apply migrations; wire config; use
  Redis/logging. Use when working inside a Damat app (it has damat.config.ts and
  src/modules/) on anything that is NOT specifically packaging/installing a
  module (for that, use the damat-modules skill). Triggers on "add an endpoint",
  "add a model/table", "add a service method", "create a migration", "run the
  damat app", "add a workflow", "wire up config", or general "work on the damat
  backend".
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

## Ground rules

- **Bun only.** `bun install`, `bun run <script>`, `bun test`. Never npm/yarn/pnpm.
- **Imports:** app code imports `defineConfig`, `defineModule`, `ModuleService`,
  `getModule` from `@damatjs/framework`; route helpers (`RouteHandler`,
  `defineRoute`) from `@damatjs/framework/router`; models from
  `@damatjs/orm-model`. Use `@damatjs/deps/<lib>` (e.g. `@damatjs/deps/zod`)
  instead of importing `zod`/`hono`/`effect`/`pg`/`ioredis` directly.
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

## Need to package or install a feature as a module?

Switch to the **`damat-modules`** skill — it covers authoring a standalone
module (`damat module init/dev/validate`, the `module.json` contract) and
installing existing ones (`damat module add`, the MCP tools).

## Guardrails

- Don't hand-edit migrations that have already been applied; create a new one.
- Don't bypass config validation by reading `process.env` ad hoc inside modules
  — declare it in the module's credentials schema/loader.
- Confirm before destructive DB actions (revert in production, dropping tables).
- After schema changes, always tell the user (or run) `damat-orm migrate:up`.
