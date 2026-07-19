# AGENTS.md — working in the Damat repository

This is the machine-facing map for the Damat monorepo. Read it before changing
the repository, then read the affected package's `README.md` and `docs/` folder.
The human walkthrough starts in [The Damat Guide](./docs/GUIDE.md).

## What Damat is

Damat is a composable TypeScript backend framework built on Bun, Hono,
PostgreSQL, Effect, and optional Redis. Applications combine independently
authored modules with file-based HTTP routes, in-process workflows, durable
jobs, durable events, and durable pipelines.

PostgreSQL is the authoritative record for domain data and durable execution.
Redis is an optional, rebuildable acceleration layer for wake-ups, liveness,
cache, pub/sub, locks, sessions, and rate limiting. It is never the only copy of
job, event, pipeline, inspection, or control history.

## Non-negotiable repository rules

1. **Trust source.** Package names and versions come from each `package.json`.
2. **Use Bun.** Use `bun install`, `bun run`, and `bun test`; never introduce
   npm, Yarn, or pnpm workflows.
3. **Keep dependencies deliberate.** Prefer existing `@damatjs/*` packages and
   curated imports from `@damatjs/deps/<library>`.
4. **Keep TypeScript strict and ESM.** All packages are `type: module` and use
   `@damatjs/typescript-config`.
5. **Keep every code file at 100 physical lines or fewer.** This includes tests,
   scripts, fixtures, generated code, and production files. Split by concern.
6. **Keep documentation synchronized.** Living docs describe only current
   behavior. Upgrade history belongs in `releases/<package>/`. Follow
   [the documentation standard](./docs/DOCUMENTATION-STANDARD.md).
7. **Run package tests through package scripts.** At the repository root use
   `bun run test`, not `bun test`; the root runner isolates package mocks and
   provisions independent PostgreSQL databases.
8. **Do not re-export generated CRUD.** `ModuleService` already supplies it.
   Add only genuinely new domain or integration behavior.

## Architecture at a glance

| Concern                | Owner                      | Runtime role                                                                   |
| ---------------------- | -------------------------- | ------------------------------------------------------------------------------ |
| Domain schema and CRUD | Modules + ORM              | PostgreSQL-backed request and service work                                     |
| HTTP                   | Framework router           | `server` or `all` process                                                      |
| Workflow               | `@damatjs/workflow-engine` | In-process saga with compensation                                              |
| Job                    | `@damatjs/jobs`            | One durable deferred unit                                                      |
| Event                  | `@damatjs/events`          | Ephemeral fact or durable per-consumer delivery                                |
| Pipeline               | `@damatjs/pipelines`       | Durable, inspectable graph across waits, branches, jobs, events, and workflows |
| Durability             | `@damatjs/durability`      | Shared transactions, outbox, leases, controls, inspection, retention           |
| Acceleration           | `@damatjs/redis`           | Optional wake-up, liveness, invalidation, cache, lock, and pub/sub data        |

Every application process owns exactly one PostgreSQL pool. HTTP, modules,
jobs, events, pipelines, inspection, and maintenance share it. A pool is a
bounded concurrency object, not a single physical connection.

Framework startup checks migration readiness but does not mutate schemas.
Generated development scripts run an idempotent setup preflight; production
deployments run one explicit migration job before starting API or workers.

## Repository map

```text
damat/
├── AGENTS.md                       # this repository guide
├── README.md                       # project overview
├── MODULES.md                      # damat.json manifest contract
├── docs/GUIDE.md                   # human guide index
├── docs/guide/                     # current user documentation
├── releases/                       # package change and upgrade history
├── backend/default/                # complete reference backend
├── packages/
│   ├── framework/                  # bootstrap, config, router, runtime roles
│   ├── service/                    # ModuleService, PoolManager, defineModule
│   ├── module/                     # module contract, harness, runtime, registry
│   ├── module-generator/           # schema and CRUD slice generation
│   ├── workflow-engine/            # in-process saga engine
│   ├── link/                       # app-owned cross-module relationships
│   ├── installer/                  # transactional capability installation
│   ├── core/
│   │   ├── durability/             # canonical durable coordination contracts
│   │   ├── jobs/                   # PostgreSQL-backed background jobs
│   │   ├── events/                 # typed bus + durable delivery
│   │   ├── pipelines/              # persisted orchestration graphs
│   │   ├── redis/                  # cache, pub/sub, locks, acceleration
│   │   ├── logger/                 # structured logging
│   │   ├── env/                    # environment cascade
│   │   └── types/                  # shared errors and types
│   ├── orm/                        # model, pg, connector, migration, CLI, codegen
│   ├── auth/                       # provider contract and adapters
│   └── cli/                        # app, module, support, codegen, and damat CLIs
├── .agents/skills/                 # Codex/agent Damat skills
└── .claude/skills/                 # synchronized Claude skill copies
```

## Canonical commands

### Repository

```bash
bun install
bun run build                 # serialized dependency-safe Turbo build
bun run lint
bun run check-types
bun run test                  # isolated packages + managed PostgreSQL/Redis
bun run format
```

### Generated backend

```bash
bun run db:setup              # create configured DB and apply every migration
bun run db:migrate            # apply pending migrations to an existing DB
bun run db:status
bun run dev                   # db:setup preflight, then hot-reload server/workers
bun test
```

`damat create <name>` asks for a complete PostgreSQL URL or host, port, user,
password, and database name. Non-interactive automation can use
`--database-url` or the individual `--database-*` flags. Use
`--no-database-setup` or `--no-install` only when intentionally deferring setup.

### Standalone module

```bash
bun run database:setup        # create dev DB and apply only this module's migrations
bun run migration:create
bun run migration:run
bun run migration:status
bun run codegen
bun run validate
bun run dev                   # module database preflight + standalone server
bun test
```

The standalone module command never installs the backend's shared durability,
jobs, events, or pipeline catalogs. The assembled backend owns those tables.

## Common work

### Add or change a model

1. Add one model per file with `@damatjs/orm-model`.
2. Include it in the module service's `collectModels([...])` input.
3. Generate and review the migration.
4. Run `bun run db:migrate` in an app or `bun run migration:run` in a module.
5. Run codegen to refresh types, schemas, registries, and missing CRUD slices.

Relations may target only tables owned by the same module. Cross-module
relationships are links owned by the backend.

### Add business behavior

Follow `route → workflow → step → service → ORM`.

- Routes validate input, call a workflow, and shape HTTP responses.
- Workflows orchestrate steps and compensation.
- Steps call generated model accessors or intentional service methods.
- Services expose generated CRUD plus new integration/domain operations only.
- Provider SDK details and pure helpers live in small `src/lib/` files.

### Add a workflow

Use `createStep` for forward and compensation behavior and `createWorkflow` for
the local saga. Workflows are in-process and do not persist every boundary. Use
a pipeline when the outer process must survive restarts, wait, branch, expose
each stage to operators, or compose multiple durable primitives.

### Add a durable job, event, or pipeline

- A **job** is one deferred, retryable unit.
- An **event** is a fact; durable events give each named consumer independent
  persisted delivery.
- A **pipeline** is a persisted graph and may call a workflow as one node.

Register definitions before framework bootstrap, enable the service in
`damat.config.ts`, select the worker in `runtime.workers`, and apply migrations.
Keep payload/result/history canonical in PostgreSQL. Redis may wake work but
cannot grant leases or decide execution ownership.

### Link modules

Links live under the app's `src/links/`, never as foreign keys inside a module.
Define the link, aggregate it with `defineLinkModule`, add `links` to config,
generate a `link:<owner>` migration, migrate, and regenerate linked types.
Runtime access is through `getModule("link")`.

### Install a module

Prefer the module MCP tools when connected; otherwise use:

```bash
damat module plan <registry-ref|path|git-url>
damat module add <registry-ref|path|git-url>
bun run db:migrate
```

Installation is transactional for owned files but intentionally does not edit
shared app config, aliases, environment files, barrels, or call sites. Review
the integration notices, wire the installed capabilities, migrate, then restart.
Never bypass a rejected or revoked registry artifact.

## Runtime and durability rules

- `runtime.mode` is `server`, `worker`, or `all`.
- Worker names are `jobs`, `events`, and `pipelines`.
- `server` never starts workers.
- `worker` is headless and must select at least one enabled worker.
- `all` serves HTTP and starts the selected workers in one process.
- Healthy Redis uses wake-up-driven processing plus a PostgreSQL safety scan.
- Missing, unavailable, or unauthorized Redis activates bounded PostgreSQL
  fallback; it does not make durable work incorrect.
- Redis ACL users need channel access for `&damat:*` and `&damat-events` when
  wake-ups and broadcast are enabled.
- Execution leases and fencing are always PostgreSQL-authoritative.
- Administrative mutations require actor, reason, timestamp, and idempotency.

## Documentation rules

Living documentation includes root/package READMEs, package `docs/`,
`MODULES.md`, and `docs/guide/`. It describes current behavior without version
history or upgrade language. Package changes also update that package's
`releases/<name>/next.md` and release index.

When changing generated scaffold guidance, update its source document and run
the generator; never hand-edit only the embedded output.

## Skills

- `damat-backend` handles backend creation, app assembly, routes, modules,
  runtime configuration, durable work, migrations, operation, and deployment.
- `damat-modules` handles authoring one standalone, portable module.

The canonical copies live in `.agents/skills/`; keep `.claude/skills/`
synchronized.

## Safety and quality gates

- Never rewrite an applied migration; add a new one.
- Do not let request handlers, services, or workers construct their own pools.
- Do not read module credentials ad hoc from `process.env`; use the module schema
  and loader.
- Confirm destructive database operations before running them.
- Run affected package tests with coverage, then repository build, lint, changed
  line-limit check, and the canonical root test runner.

## References

- [Damat Guide](./docs/GUIDE.md)
- [Current architecture](./docs/guide/02-concepts.md)
- [`damat.json` contract](./MODULES.md)
- [Documentation standard](./docs/DOCUMENTATION-STANDARD.md)
- [Reference backend](./backend/default/README.md)
- [Package release notes](./releases/README.md)
