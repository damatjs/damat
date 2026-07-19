[Damat Guide](../GUIDE.md) › Concepts

# 2. Concepts and architecture

Damat separates reusable domain features from application-owned composition,
and separates durable truth from optional acceleration. Those two boundaries
explain most of the framework.

## A module is one portable domain blade

A module is a self-contained vertical slice:

```text
module/
├── damat.json             # identity, capabilities, paths, env, registry metadata
├── src/
│   ├── index.ts           # defineModule(...)
│   ├── service.ts         # generated CRUD + intentional integrations
│   ├── config/            # credentials schema and loader
│   ├── models/            # tables owned by this module
│   ├── migrations/        # this module's schema history
│   ├── types/             # generated rows, schemas, and registry typing
│   ├── workflows/         # optional in-process sagas
│   ├── api/routes/        # optional HTTP surface
│   ├── jobs/              # optional durable job definitions
│   ├── events/            # optional event definitions and consumers
│   └── pipelines/         # optional durable graphs
└── tests/
```

A module owns its schema and credentials. It does not import another module's
implementation or foreign-key into another module's tables. A module can leave
a non-binding `pairsWith` hint or ship a dormant link template, but the backend
owner decides whether and how to compose it.

The complete portable contract is [MODULES.md](../../MODULES.md).

## The backend owns composition

The application decides:

- which modules are installed and registered;
- which cross-module links are activated;
- which routes, workflows, jobs, events, and pipelines are imported;
- which runtime roles execute workers;
- authentication and authorization for inspection or control APIs;
- database, Redis, retention, redaction, and deployment policy.

`damat module add` installs owned capability files transactionally. It does not
silently rewrite shared application policy. Its integration report tells the
backend owner which config, aliases, environment values, barrels, and call sites
still need attention.

## The execution primitives

| Primitive | Use it when                                                               | Durability boundary                                            |
| --------- | ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Route     | An HTTP request enters the application                                    | Request lifetime                                               |
| Service   | Domain data or a new provider integration is needed                       | PostgreSQL transaction when used                               |
| Workflow  | Several local steps must compensate on failure                            | In-process saga execution                                      |
| Job       | One deferred unit needs retry, scheduling, progress, or logs              | Persisted run and attempts                                     |
| Event     | A fact has zero or more consumers                                         | Local bus, Redis broadcast, or persisted per-consumer delivery |
| Pipeline  | A long process must wait, branch, survive restarts, or expose every stage | Persisted graph, nodes, transitions, signals, and controls     |

A workflow and a pipeline are complementary. A workflow is a tightly coupled
local saga. A pipeline can call that workflow as one durable node inside a much
longer process.

## The application flow

```text
HTTP route
    │
    ▼
workflow (optional local saga)
    │
    ▼
step
    │
    ▼
module service ── generated CRUD / transaction / provider integration
    │
    ▼
shared PostgreSQL pool
```

Routes validate and shape transport. Workflows orchestrate. Steps perform the
business action and compensation. Services expose generated model accessors and
only genuinely new domain/provider operations. The ORM persists through the
process's shared pool.

Durable work may start from any layer. When a domain write and a job, event, or
pipeline start must commit together, pass the `ModuleService.transaction`
executor into the durable API. The rows and acceleration outbox entry then
commit or roll back atomically.

## PostgreSQL is memory; Redis is acceleration

PostgreSQL stores the complete durable record:

- definitions and immutable versions;
- payload metadata, results, and errors;
- attempts, transitions, schedules, leases, and fencing tokens;
- progress, logs, worker snapshots, control history, and audit activity;
- acceleration outbox/checkpoints and retention overrides.

Redis stores only rebuildable coordination data:

- wake-up channels and ready identifiers;
- short-lived worker liveness;
- inspection invalidations;
- application cache, sessions, locks, rate limits, and optional broadcast.

If Redis is unavailable or unauthorized, durable execution continues through
bounded PostgreSQL fallback. When Redis returns, its projection is rebuilt from
PostgreSQL. Redis cannot grant a durable lease or decide which worker won.

## One pool per process

Each process creates one PostgreSQL pool and shares it across HTTP, module
services, jobs, event routing/delivery, pipelines, inspection, and maintenance.
The pool can hold several physical connections up to its configured maximum.
Sharing a pool does not mean forcing `max: 1`.

In `runtime.mode: "all"`, one durability coordinator coalesces maintenance and
wake-ups for all durable subsystems. Dedicated server/worker processes each own
their local pool and coordinator.

## Runtime roles

| Mode     | HTTP | Workers                                       |
| -------- | ---- | --------------------------------------------- |
| `server` | yes  | none                                          |
| `worker` | no   | selected `jobs`, `events`, and/or `pipelines` |
| `all`    | yes  | selected enabled workers                      |

The same build can run every role. `DAMAT_RUNTIME_MODE` and
`DAMAT_WORKER_TYPES` let deployment choose the role without rebuilding.

## Database lifecycle

Development and production intentionally differ:

- `damat create` and `damat module init` collect database credentials and write
  the local `.env`.
- Generated development `bun run dev` scripts perform an idempotent database
  setup preflight.
- Framework startup itself is read-only and reports missing migrations.
- Production runs one migration job before any API or worker replicas start.

The backend setup command creates a missing database and applies shared
durability, jobs, events, pipelines, links, and module migrations. The standalone
module setup command creates its development database and applies only that
module's migrations.

## Module lifecycle

```text
init → database setup → model → migration → codegen → extend → test → validate
     → publish/plan → install → integrate → backend migration → run
```

Authors stop at a portable, validated blade. Backend owners inspect, install,
compose, migrate, and operate it.

## Choosing the next chapter

| Goal                                   | Read                                                           |
| -------------------------------------- | -------------------------------------------------------------- |
| Create a backend and database          | [Getting started](./03-getting-started.md)                     |
| Configure runtime roles and durability | [Configuration](./04-configuration.md)                         |
| Change schema safely                   | [Migrations](./06-migrations.md)                               |
| Build local compensation               | [Workflows](./09-workflows.md)                                 |
| Add durable jobs or events             | [Events and jobs](./10b-events-and-jobs.md)                    |
| Build long-running orchestration       | [Pipelines](./10c-pipelines.md)                                |
| Author a reusable module               | [Authoring modules](./13-authoring-modules.md)                 |
| Assemble modules into an app           | [Composing and linking](./17-composing-and-linking-modules.md) |

---

Prev: [← Introduction](./01-introduction.md) · [Guide home](../GUIDE.md) · Next: [Getting started →](./03-getting-started.md)
