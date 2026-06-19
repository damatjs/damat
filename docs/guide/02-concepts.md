[Damat Guide](../GUIDE.md) › Concepts

# 2. Concepts — modules & the framework

This chapter is the **idea** behind Damat: what a module is, why the backend is
shaped this way, and how the framework turns a folder of modules into a running
server. Read it once and the rest of the guide will click into place.

## The problem Damat solves

Most backend frameworks make you choose between two bad options:

- a **monolith** where every feature is entangled with every other, so adding
  billing means touching auth, and reusing a feature in another app means
  copy-pasting and re-wiring; or
- a **pile of libraries** you assemble yourself, where there is no standard
  shape for a feature, no shared lifecycle, and no way to share a whole feature
  (its tables, migrations, service, and config) as one thing.

Damat's answer is the **module**: a standard, self-contained shape for a feature,
plus a **framework** that knows how to wire any number of modules together.

## What a module is

A module is a **vertical slice** of a backend — everything one domain concern
needs, in one folder:

```
modules/user/
├── module.json     # the portable contract (name, env, packages, deps, registry)
├── index.ts        # defineModule(...) — the module's public definition
├── service.ts      # ModuleService({ models, credentialsSchema }) — data + logic
├── config/         # a zod schema + a loader for the module's credentials
├── models/         # ORM model definitions (its tables)
├── migrations/     # SQL migrations (its schema history)
└── workflows/      # optional saga workflows
```

Three properties make this powerful:

1. **Self-contained.** A module owns its tables, its migrations, its service,
   and the env/credentials it needs. Nothing about a module is scattered across
   the app.
2. **Portable.** Because the shape is standard and described by `module.json`,
   the same module can be dropped into any Damat app — `damat module add` copies
   it in, registers it, syncs its env vars, and installs its npm deps. See
   [MODULES.md](../../MODULES.md).
3. **Independently developable.** A module can run and be tested **on its own**,
   with no surrounding app, using the [`@damatjs/module`](../../packages/module/README.md)
   harness. You build and verify a feature in isolation, then ship it.

> A useful analogy: modules are to a Damat backend what components are to a
> frontend — a standard unit you compose, reuse, and share.

## How the backend is a *framework*

You write modules and route files; the framework does the wiring. When your app
starts ([`@damatjs/framework`](../../packages/framework/README.md) drives this),
it:

1. **loads & validates config** — reads `damat.config.ts`, including each
   module's credentials (validated against its zod schema, so bad config fails
   fast at boot, not at request time);
2. **connects infrastructure** — opens the PostgreSQL pool
   ([`orm-connector`](../../packages/orm/connector/README.md) +
   [`orm-pg`](../../packages/orm/pg/README.md)) and, if `redisUrl` is set,
   Redis ([`@damatjs/redis`](../../packages/core/redis/README.md));
3. **initializes modules** — instantiates each module's service against the
   shared pool and registers it so it can be retrieved anywhere with
   `getModule(id)`;
4. **builds the HTTP layer** — scans `src/api/routes/**/route.ts` into a Hono
   router, applies middleware (CORS, headers, request IDs, error handling), and
   exposes health/introspection endpoints;
5. **starts & guards the server** — listens via `@hono/node-server` and installs
   graceful SIGINT/SIGTERM shutdown.

You never write that bootstrap. You declare *what* (modules + routes); the
framework decides *how* and *when*.

## The four layers you compose

```
            ┌────────────────────────────────────────────┐
   Routes   │  src/api/routes/**/route.ts  (HTTP surface) │
            └───────────────┬────────────────────────────┘
                            │ getModule(id)
            ┌───────────────▼────────────────────────────┐
  Workflows │  steps + sagas (multi-step, compensating)   │
            └───────────────┬────────────────────────────┘
                            │ calls
            ┌───────────────▼────────────────────────────┐
  Services  │  ModuleService: CRUD + transactions + logic │
            └───────────────┬────────────────────────────┘
                            │ uses
            ┌───────────────▼────────────────────────────┐
   Models   │  the ORM DSL → tables, relations, migrations│
            └─────────────────────────────────────────────┘
```

1. **Models** define your tables with the [ORM DSL](./05-models.md).
2. **Services** turn models into typed CRUD plus your business logic
   ([ModuleService](./07-modules-and-services.md)).
3. **Modules** bundle models + service + config + migrations into a portable
   unit registered in `damat.config.ts`.
4. **Routes** and **workflows** expose and orchestrate that logic
   ([HTTP](./08-http-apis.md), [workflows](./09-workflows.md)).

A typical request flows down and back:
`route → module service (CRUD / transaction) → ORM → Postgres`.
A multi-step operation that must roll back on failure goes through a workflow:
`route → workflow → steps → module services`, with the engine running
compensations in reverse if a step throws.

## How modules compose

Modules stay decoupled, but real apps need them to work together. Damat offers
three mechanisms:

- **`getModule(id)`** — at runtime, any route, step, or service can fetch another
  module's service by id. This is the everyday way modules call each other.
- **Links** (`src/links/`) — declare cross-module relationships *outside* the
  modules themselves, so neither module hard-depends on the other's tables. A
  link generates a junction table and a `getModule("link")` service to create,
  dismiss, fetch, and graph-query across modules. See
  [`@damatjs/link`](../../packages/link/README.md) for the full model.
- **Pairing hints** — a module can leave a non-binding `pairsWith` hint in its
  `module.json` suggesting modules it works well with. It's a comment for the
  backend owner, who decides what to actually install and link — a module never
  dictates composition. (A hard `modules` dependency exists as a rare escape
  hatch; installing warns if one is missing.)

## The module lifecycle

```
author ──► validate ──► (publish) ──► install ──► migrate ──► run
  │           │                          │           │
  │           │                          │           └─ damat-orm migrate:up
  │           │                          └─ damat module add <source>
  │           └─ damat module validate  (no warnings = registry-ready)
  └─ damat module init / dev / migration:create / codegen
```

- **Author & test** a module standalone ([chapter 13](./13-authoring-modules.md)).
- **Validate** it against the contract; clean it up until it's registry-ready.
- **Publish** it to a registry (or just push it to git / keep it local).
- **Install** it into an app — from a registry ref, a path, or git
  ([chapter 14](./14-installing-modules.md)).
- **Migrate** to apply its schema, then **run**.

## Trust & the registry

Modules are addressed by **ref** (`user`, `damatjs/user@0.2.0`). A registry maps
a ref to a fetchable source plus trust metadata — a verifiable **owner** and a
**verification status** the registry backend stamps (an author cannot
self-verify). At install time a policy (`DAMAT_MODULE_VERIFY`: `off` / `warn` /
`require`) decides whether unverified modules may be installed; `rejected` and
`revoked` modules are always blocked. This is what makes "install a module by
name" safe. Full model: [MODULES.md](../../MODULES.md) and
[the AI install chapter](./15-installing-modules-with-ai.md).

## When to reach for what

| You want to… | Use |
|--------------|-----|
| Add a table | a [model](./05-models.md) in a module's `models/` |
| Add reusable data logic | a method on the module's [service](./07-modules-and-services.md) |
| Expose an endpoint | a [route file](./08-http-apis.md) |
| Coordinate steps that must roll back | a [workflow](./09-workflows.md) |
| Cache / rate-limit / queue / lock | [`@damatjs/redis`](./10-redis.md) |
| Package a feature for reuse | a [module](./13-authoring-modules.md) + `module.json` |
| Pull in someone else's feature | [install a module](./14-installing-modules.md) |

---

Prev: [← Introduction](./01-introduction.md) · [Guide home](../GUIDE.md) · Next: [Getting started →](./03-getting-started.md)
