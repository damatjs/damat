# AGENTS.md — building this Damat module

This repository is one standalone, portable Damat module. It owns a single
domain concern and may provide models, migrations, config, routes, workflows,
jobs, events, pipelines, links, and tests. It does not decide how a host
application composes or operates those capabilities.

## Start here

- Use Bun only: `bun install`, `bun run <script>`, and `bun test`.
- Use strict TypeScript and ESM.
- Keep every code file at 100 physical lines or fewer.
- Read `damat.json` before changing package layout or capabilities.
- Use `bun run dev` for capability-aware database preflight and local workers.

The generated `.env` contains the selected development `DATABASE_URL`.
Module initialization either accepts a complete URL or asks for host, port,
user, password, and database name. It creates the database and applies this
module's migrations by default.

## Commands

```bash
bun run database:setup    # create dev DB + apply only this module's migrations
bun run migration:create # generate the next migration from model changes
bun run migration:run    # apply this module's pending migrations
bun run migration:status
bun run codegen           # rows, zod, registry, and missing CRUD slices
bun run dev               # DB/catalog preflight + standalone HTTP/workers
bun run validate          # manifest and publishing readiness
bun run typecheck
bun run build             # typecheck + validate
bun test
```

The explicit `database:setup` and migration commands apply only this module's
migrations. `bun run dev` additionally installs the system catalogs required by
declared durable capabilities and starts local workers with development
defaults. After installation, the backend owner chooses migrations, workers,
queues, concurrency, Redis, retention, and operations.
During source reload, the development watcher awaits HTTP and worker shutdown
before starting the next runtime.
Use `damat module dev --verbose` or `damat --verbose module dev` for the full
underlying stack when preflight, migration, codegen, validation, or build fails.
Interactive Ctrl-C completes worker cleanup before the watcher exits.

## The blade rule

This module must remain independent:

- It owns only its own models and migrations.
- It never imports another module's implementation.
- It never foreign-keys into another module's table.
- It never selects host workers, concurrency, queues, retention, Redis, auth, or
  deployment policy.
- It never edits host config, aliases, environment files, barrels, or call sites.
- It may use `pairsWith` as a non-binding suggestion.
- It may ship a dormant link template; the host chooses whether to activate it.

Installation, composition, shared migrations, runtime roles, dashboards, and
deployment belong to the backend owner.

## Layout

```text
.
├── damat.json             # identity, install capabilities, runtime paths
├── module.config.ts       # standalone runtime overrides
├── package.json
├── .env                   # selected local DATABASE_URL; ignored
├── .env.example
├── src/
│   ├── index.ts           # defineModule(...)
│   ├── service.ts         # models + ModuleService subclass
│   ├── config/            # credentials schema and loader
│   ├── models/            # one owned table per file
│   ├── migrations/        # generated schema history
│   ├── types/             # generated; do not edit
│   ├── lib/               # provider implementations and pure helpers
│   ├── workflows/         # local sagas; CRUD slice is scaffolded once
│   ├── api/routes/        # HTTP surface; CRUD slice is scaffolded once
│   ├── jobs/              # optional durable job definitions
│   ├── events/            # optional event definitions/consumers
│   ├── pipelines/         # optional durable graphs
│   └── links/             # optional dormant link templates
└── tests/
```

Optional directories need not contain placeholder code. Keep `damat.json`
capability paths synchronized with what the package actually provides.
A fresh scaffold declares only `module` and `tests`; add models, migrations,
routes, workflows, jobs, events, pipelines, links, and types to the manifest
only when their real files exist.

## Codegen-first flow

1. Add or change models.
2. Include them with `collectModels([...])`.
3. Run `bun run migration:create` and review the SQL.
4. Run `bun run database:setup` or `migration:run`.
5. Run `bun run codegen`.
6. Extend generated workflows, steps, validators, and routes in place.
7. Add only domain behavior the generated surface cannot provide.
8. Test, build, and validate.

Codegen replaces `src/types/` and registry typing. It creates missing CRUD
workflow/route files once and preserves edits on later runs. Do not create a
second CRUD path beside the generated one.

## Layering

Use one direction:

```text
route → workflow → step → service → model accessor / provider
```

A route validates and shapes HTTP. A workflow orchestrates. A step performs the
action and owns compensation. A service exposes generated CRUD and intentional
new provider/domain operations. Provider SDK details and pure helpers belong in
small `src/lib/` files.

## Generated CRUD

`ModuleService({ models })` supplies typed accessors with:

- `create`, `createMany`, `upsert`, and `upsertMany`;
- `find`, `findById`, `findOne`, and `findMany`;
- `update`, `updateOne`, `delete`, `softDelete`, and `restore`;
- `count`, `exists`, and transactions.

Never add a service method that merely forwards to one accessor. Plain CRUD
modules correctly use an empty service subclass. Add methods only for genuinely
new integration or complex domain behavior, and keep their implementation in
`src/lib/`.

## Imports

Import from the package that owns the API:

```ts
import { defineModule, ModuleService } from "@damatjs/services";
import { getModule } from "@damatjs/framework";
import type { RouteHandler } from "@damatjs/framework/router";
import { collectModels, columns, model } from "@damatjs/orm-model";
import { createStep, createWorkflow, Effect } from "@damatjs/workflow-engine";
import { defineJob } from "@damatjs/jobs";
import { defineDurableEvent, defineDurableEventHandler } from "@damatjs/events";
import { definePipeline } from "@damatjs/pipelines";
import { z } from "@damatjs/deps/zod";
```

`@damatjs/module` owns manifest, standalone runtime/harness, migration/codegen
tooling, and registry APIs. It is not the umbrella for all authoring packages.

## Portable imports

Code must resolve both here and after source installation:

- Use `@<module>/*` for files that stay inside the module.
- Routes import workflows through the bare `@workflows` barrel.
- Workflows import sibling steps relatively.
- Never use `@/`; the host application owns it.
- Never hand-edit generated `index.ts` barrels.

## Models

Define one table per file with `@damatjs/orm-model`. Intra-module relations
target the owned table name. A conceptual reference to another module is a plain
identifier, not an ORM relation or foreign key.

Use `collectModels([...])` so accessor keys derive consistently from table
names.

## Service and credentials

The service extends `ModuleService({ models, credentialsSchema })`. Credentials
are read in `src/config/load.ts`, validated by the schema, and declared in
`damat.json.module.env`.

Do not read `process.env` ad hoc from services, workflows, jobs, events, or
pipelines. Do not put host secrets in source or the manifest.

## Workflows

Use `createStep` for forward and compensation behavior and `createWorkflow`
for a local saga. A workflow is appropriate when completed steps must compensate
in reverse after a failure. It does not persist the outer process across a crash.

## Durable capability providers

This module may ship stable definitions:

- jobs for deferred retryable units;
- events and named durable consumers for facts;
- pipelines for persisted waits, branches, joins, loops, signals, jobs, events,
  workflows, and bounded children.

Definitions must load before backend bootstrap. The host chooses service config,
worker roles, queues, concurrency, retention, Redis, and operational routes.
Document required wiring in `install.instructions`.

## `damat.json`

The manifest uses the Damat schema envelope:

```jsonc
{
  "$schema": "https://damat.dev/schemas/damat-v1.json",
  "schemaVersion": 1,
  "kind": "module",
  "name": "inventory",
  "version": "1.0.0",
  "install": {
    "modes": ["source"],
    "default": "source",
    "provides": {
      "module": { "from": "src/**", "fallbackTo": "src/modules/{id}" },
      "routes": {
        "from": "src/api/routes/**",
        "fallbackTo": "src/api/routes/{id}",
      },
      "jobs": { "from": "src/jobs/**", "fallbackTo": "src/jobs/{id}" },
    },
    "usageHints": [{ "token": "inventory" }],
    "instructions": {
      "add": ["Register/import inventory capabilities, then migrate."],
    },
  },
  "module": {
    "description": "Stock and reservations.",
    "models": "./src/models",
    "migrations": "./src/migrations",
    "routes": "./src/api/routes",
    "jobs": "./src/jobs",
    "env": [],
    "pairsWith": ["catalog"],
    "registry": {
      "namespace": "acme",
      "license": "MIT",
      "keywords": ["inventory"],
    },
  },
}
```

Use `pairsWith` instead of hard module dependencies unless the dependency is
unavoidable. Keep provider capabilities and module paths honest.

## Dormant links

A module may ship a `defineLink` file under
`src/links/models/<from>-<to>.ts`. Import `defineLink` from
`@damatjs/framework`, name the other module by identity, and import none of its
code. Ship no link migration. The backend owner reviews and activates it.

## Testing

Use `withModule` for database behavior without an app:

```ts
import { withModule } from "@damatjs/module";
import module from "../src";

await withModule(module, { moduleDir }, async ({ service }) => {
  const item = await service.items.create({ data: { name: "A" } });
  // assertions
});
```

The harness applies the manifest-declared migration path and the local catalogs
required by declared durable capabilities. An unsuccessful migration rejects
boot and clears the connection and shared pool state; `migrate: false` skips the
whole migration preflight. Test one module per process.

A durable event definition with no local consumer is a valid producer-only
module: standalone development starts its router without an empty worker.
Missing or unauthorized Redis degrades wakeups to PostgreSQL polling and keeps
ephemeral events local; it must not abort module startup. Test host runtime
policy separately in an assembled backend integration.

## Validate and share

`bun run validate` reports errors that block installation and warnings that
block publishing readiness. Resolve both. A backend owner should still run
`damat module plan <source>` before installation and review every integration
notice.

## Quality checklist

- Models and migrations agree.
- Codegen is current.
- No duplicated generated CRUD.
- Credentials are declared and validated.
- Capability paths exist and match `damat.json`.
- Optional durable definitions use stable names.
- Tests, typecheck, build, and validate pass.
- Every code file is 100 lines or fewer.
- Living docs describe current behavior only.
