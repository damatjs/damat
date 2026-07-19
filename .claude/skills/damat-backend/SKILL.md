---
name: damat-backend
description: >-
  Build, operate, and assemble a Damat backend: create the app and database,
  configure runtime roles, add models/services/routes/workflows, author durable
  jobs/events/pipelines, run migrations, use Redis acceleration, install and
  compose modules, create links, and prepare deployment or operational
  inspection. Use inside a Damat application with damat.config.ts. For authoring
  one standalone shareable module, use damat-modules.
---

# Working in a Damat backend

Use this skill for application ownership: creating the backend, deciding what
modules and durable capabilities it runs, and operating the assembled system.

Read when needed:

- `AGENTS.md` — repository rules and architecture.
- `docs/guide/02-concepts.md` — the current mental model.
- `docs/guide/03-getting-started.md` — clean application/database bootstrap.
- `docs/guide/10b-events-and-jobs.md` and `10c-pipelines.md` — durable work.
- `backend/default/` — the reference application.
- `MODULES.md` — portable artifact and capability contract.
- the affected package `README.md` + `docs/`.
- `releases/<package>/` for upgrade history.

## First principle: the backend owns composition

A module is a portable blade. The backend decides:

- which modules are registered;
- which links are activated;
- which routes, workflows, jobs, events, and pipelines are imported;
- which process roles execute durable workers;
- database, Redis, retention, redaction, auth, and deployment policy;
- how inspection and administrative controls are exposed.

Do not make a module decide these application-wide concerns.

## Bootstrap a clean backend

Prefer the scaffold:

```bash
bunx @damatjs/damat-cli@latest create my-api
cd my-api
bun run dev
```

`damat create` asks for either a complete PostgreSQL URL or host, port, user,
hidden password, and database name. It writes `.env`, installs dependencies,
creates the database when missing, and applies module plus durability/jobs/
events/pipeline migrations.

For automation:

```bash
damat create my-api \
  --database-url postgresql://user:password@localhost:5432/my_api
```

Individual `--database-host`, `--database-port`, `--database-user`,
`--database-password`, and `--database-name` options are also supported.
Use `--no-install` or `--no-database-setup` only when intentionally deferring
those phases.

Generated scripts:

```bash
bun run db:setup       # create the configured DB and apply every migration
bun run db:migrate     # migrate an existing DB
bun run db:status
bun run dev            # db:setup preflight, then server/workers
bun test
```

Development preflights are idempotent. Production uses one explicit migration
job before API or worker replicas; framework startup never mutates schemas.

## Durable architecture

- PostgreSQL is canonical for jobs, durable events, pipelines, inspection,
  controls, attempts, leases, logs, results, and audit history.
- Redis is optional acceleration: wake-ups, ready identifiers, liveness,
  invalidations, cache, pub/sub, locks, sessions, and rate limits.
- Redis loss activates bounded PostgreSQL fallback and does not lose work.
- Execution leases and fencing are always PostgreSQL-authoritative.
- Each process owns one shared PostgreSQL pool with bounded concurrency.
- `all` mode shares one durability coordinator across durable subsystems.

Authenticated Redis users need channel rules for `&damat:*` and
`&damat-events` when durable wake-ups and event broadcast are enabled.

## Choose the correct primitive

| Need                                      | Primitive      |
| ----------------------------------------- | -------------- |
| HTTP transport                            | route          |
| typed data access or provider integration | module service |
| local multi-step compensation             | workflow       |
| one deferred retryable unit               | job            |
| a fact with zero or more consumers        | event          |
| persisted wait/branch/long orchestration  | pipeline       |

A pipeline may invoke a workflow as one node. Do not model a long, restartable
business process as a hidden chain of jobs/events when operations needs a graph.

## Common tasks

### Change a model

1. Add one model per file under `src/modules/<id>/models/`.
2. Use `collectModels([...])` in the module service.
3. Generate a migration with `damat-orm migrate:create <name>`.
4. Review SQL and run `bun run db:migrate`.
5. Run `damat codegen <module>` or `--all`.

Relations reference only tables in the same module. Cross-module relationships
are links.

### Add domain behavior

Follow `route → workflow → step → service → ORM`.

`ModuleService` already provides create/createMany/upsert/upsertMany/find/
findById/findOne/findMany/update/updateOne/delete/softDelete/restore/count/
exists and transactions. Never wrap those in pass-through service methods.
Add a service method only for genuinely new domain/provider behavior, with SDK
and helper details in small `src/lib/` files.

### Add an HTTP endpoint

Create `src/api/routes/<path>/route.ts` and export handlers from
`@damatjs/framework/router`. Dynamic folders use `[param]`. Routes validate,
call a workflow, and shape the response; they do not hold business logic.

### Add an in-process workflow

Use `createStep` for forward and compensation behavior, then compose with
`createWorkflow`. Use direct step calls for one step or `yield*` inside
`Effect.gen` for several. A workflow is local saga execution, not persisted
outer orchestration.

### Add a job

Define a stable job name and handler, import the definition before bootstrap,
enable `services.jobs`, select `jobs` in `runtime.workers`, and migrate.
Handlers must tolerate at-least-once execution and use stable idempotency for
effects.

### Add a durable event

Define the event and stable named consumers, import them before bootstrap,
enable `services.events.durable`, select `events`, and migrate. Each consumer
owns an independent persisted delivery identity.

Use the local event bus for in-process facts and Redis broadcast only when
cross-process ephemeral delivery is acceptable.

### Add a pipeline

Use `definePipeline` for restartable graphs across jobs, events, workflows,
waits, signals, branches, joins, loops, and bounded child pipelines. Register
referenced capabilities before bootstrap, enable `services.pipelines`, select
`pipelines`, and migrate.

Keep code-owned definitions source-controlled. Use the headless authoring client
for web-owned drafts, publication, activation, rollback, and layouts. The app
owns authenticated HTTP/UI policy.

### Commit domain data and durable work together

Use `ModuleService.transaction` and pass its executor into enqueue, durable
publish, pipeline start/signal, or idempotency APIs. The domain rows, durable
state, and acceleration outbox then commit or roll back together.

### Inspect and control work

Use the headless job/event/pipeline inspection clients. Complete operational
records come from PostgreSQL; invalidations contain identity/revision only.
Administrative actions require actor, reason, and idempotency. Never expose
control clients through unauthenticated framework-owned routes.

### Install and compose a module

Prefer the module MCP tools when connected. Otherwise:

```bash
damat module plan <ref|path|git-url>
damat module add <ref|path|git-url>
bun run db:migrate
```

The installer owns copied files and provenance but not shared config, aliases,
environment values, barrels, or call sites. Review the integration report,
register/import capabilities, configure env, migrate, then restart. Respect the
verification gate; rejected and revoked artifacts are never allowed.

### Link two modules

Declare links under the app's `src/links/<owner>/`, aggregate them with
`defineLinkModule`, configure `links: "./src/links"`, then:

```bash
damat-orm migrate:create link:<owner>
bun run db:migrate
damat codegen --all
```

Runtime access is `getModule("link")`. Modules never foreign-key into another
module's table.

## Runtime roles

```ts
runtime: {
  mode: "all", // "server" | "worker" | "all"
  workers: ["jobs", "events", "pipelines"],
  shutdownGraceMs: 30_000,
}
```

- `server`: HTTP only.
- `worker`: headless, at least one enabled worker.
- `all`: HTTP and selected workers in one process.

Deployment may override with `DAMAT_RUNTIME_MODE` and
`DAMAT_WORKER_TYPES`.

## Verification

For app work, run affected tests, then:

```bash
bun run build
bun run lint
bun run check-types
bun test
```

Inside the Damat monorepo use `bun run test` at the root so package mocks and
PostgreSQL databases remain isolated.

## Guardrails

- Bun only; strict TypeScript; ESM.
- Use `@damatjs/deps/<library>` for curated external imports.
- Keep every code file at 100 physical lines or fewer.
- Never rewrite an applied migration.
- Never create a pool inside a request, service, job, event, or pipeline.
- Never store canonical durable history only in Redis.
- Confirm destructive database actions.
- Update current docs and the affected package's release record together.
