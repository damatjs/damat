---
name: damat-modules
description: >-
  Author one standalone, self-contained Damat module: scaffold its development
  database, models, migrations, generated CRUD slice, service/config, routes,
  workflows, optional job/event/pipeline providers, manifest capabilities,
  tests, validation, and publishing readiness. Use for creating or changing a
  portable module package. Installing, composing, linking, and operating modules
  in an application belongs to damat-backend.
---

# Authoring a standalone Damat module

A module is one portable domain blade. It owns its models, migrations, service,
credentials, and optional capability providers. It does not decide which app
installs it, which workers run it, or how it connects to another module.

Read when needed:

- the generated `AGENTS.md` inside the module;
- root `MODULES.md` for the `damat.json` contract;
- `@damatjs/module` README and package docs;
- `@damatjs/orm-model` for models;
- `@damatjs/workflow-engine` for local sagas;
- `@damatjs/jobs`, `@damatjs/events`, and `@damatjs/pipelines` for providers.

## Start cleanly

```bash
bunx @damatjs/damat-cli@latest module init inventory
cd inventory
bun run dev
```

Module init asks for either a complete PostgreSQL URL or host, port, user,
hidden password, and database name. By default it writes `.env`, installs
dependencies, creates the development database, and applies this module's
migrations.

Automation can use `--database-url` or individual `--database-host`,
`--database-port`, `--database-user`, `--database-password`, and
`--database-name` flags. Use `--no-install` or
`--no-database-setup` only to defer those phases.

Generated commands:

```bash
bun run database:setup    # create DB + apply only this module's migrations
bun run migration:create # diff models into src/migrations
bun run migration:run    # apply only this module's pending migrations
bun run migration:status
bun run codegen
bun run validate
bun run build             # typecheck + manifest validation
bun run dev               # database preflight + standalone server
bun test
```

Standalone setup never applies shared durability, jobs, durable-event, or
pipeline catalogs. The backend owner applies them after installation.

## The blade boundary

A portable module:

- owns only its own tables and migrations;
- reads credentials through its schema and loader;
- never imports another module's implementation;
- never foreign-keys into another module's table;
- never edits host config, aliases, environment, barrels, or call sites;
- may leave a non-binding `pairsWith` hint;
- may ship a dormant link template that the backend owner can activate;
- may provide routes, workflows, jobs, events, pipelines, tests, and types.

Use the `damat-backend` skill for installation, runtime selection, links,
shared migrations, dashboards, and deployment.

## Standard layout

```text
.
├── damat.json
├── module.config.ts
├── package.json
├── .env
├── .env.example
├── src/
│   ├── index.ts
│   ├── service.ts
│   ├── config/
│   ├── models/
│   ├── migrations/
│   ├── types/
│   ├── lib/
│   ├── workflows/
│   ├── api/routes/
│   ├── jobs/
│   ├── events/
│   ├── pipelines/
│   └── links/
└── tests/
```

Not every module needs every optional folder. Declare only capabilities the
artifact intentionally provides.

## Codegen-first development

The normal loop is:

1. Add one model per file.
2. Include models with `collectModels([...])`.
3. Run `bun run migration:create` and review SQL.
4. Run `bun run database:setup` or `migration:run`.
5. Run `bun run codegen`.
6. Extend the scaffolded workflow/step/route slice.
7. Add only non-generated domain or provider behavior.
8. Test, build, and validate until there are no errors or warnings.

Codegen overwrites generated types, schemas, and registry typing. CRUD
workflows/routes are scaffolded once and then preserved. Extend existing
generated files; do not create a parallel CRUD path.

## Layering

Use one direction:

```text
route → workflow → step → service → generated accessor / provider
```

- A route validates, calls a workflow, and shapes HTTP.
- A workflow orchestrates steps and compensation.
- A step calls the typed module service.
- A service exposes generated CRUD plus genuinely new integration/domain
  behavior.
- SDK details and pure helpers live in small `src/lib/` files.

`ModuleService({ models })` already provides create/createMany/upsert/
upsertMany/find/findById/findOne/findMany/update/updateOne/delete/softDelete/
restore/count/exists and transactions. A pass-through service wrapper is a
defect. Plain CRUD modules correctly have an empty service subclass.

## Imports

Use the real package that owns each API:

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

`@damatjs/module` owns the manifest, standalone runtime/harness, tooling, and
registry surfaces. Do not treat it as an umbrella for every authoring package.

## Portable aliases

Files must resolve both standalone and after source installation.

- Module-owned files that stay together use `@<module>/*`.
- Routes reach workflows through the bare `@workflows` barrel.
- Workflow-to-step imports remain relative siblings.
- Never use `@/` in portable module code; the host owns that alias.
- Never hand-edit generated barrel files; regenerate them.

## Models and migrations

Use `@damatjs/orm-model`. Relations may target only tables owned by this
module and use the target table name. A reference to another module is a plain
identifier, not a foreign key.

Never rewrite an applied migration. Create the next migration and keep the
module's schema history self-contained.

## Workflows

Use a workflow for local multi-step behavior that compensates in reverse when a
handled step fails. Keep workflows portable and call generated accessors from
steps. A workflow does not make a process durable across a crash.

## Job, event, and pipeline providers

A module may ship definitions as installable capabilities:

- jobs for deferred retryable units;
- durable events and stable named consumers for facts;
- pipelines for persisted long-running graphs;
- workflows that a pipeline may invoke as one node.

Definitions must have stable names and be importable before backend bootstrap.
The module should not select host runtime modes, queues, concurrency, retention,
Redis policy, or inspection routes. Document required host wiring in
`install.instructions`; the backend owner enables services, selects workers,
and applies shared migrations.

## `damat.json`

The manifest is both the portable contract and install profile.

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
      "add": ["Register and import inventory capabilities, then migrate."],
    },
  },
  "module": {
    "description": "Stock items and reservations.",
    "models": "./src/models",
    "migrations": "./src/migrations",
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

Keep `install.provides` and `module.*` paths honest. Avoid hard `modules`
dependencies; use `pairsWith` unless the dependency is truly unavoidable.

## Dormant links

A module may ship `src/links/models/<from>-<to>.ts` with `defineLink` from
`@damatjs/framework`. It imports no other module code and ships no link
migration. On install the backend owner reviews the template, chooses whether
to keep it, generates a `link:<owner>` migration, and activates it.

## Credentials

Declare every required environment key in `module.env`. Read it through
`src/config/load.ts` and validate it with the module schema. Do not read
`process.env` ad hoc from services, steps, jobs, events, or pipelines.

## Testing

Use `withModule` for module behavior without a surrounding app:

```ts
import { withModule } from "@damatjs/module";
import module from "../src";

await withModule(module, { moduleDir }, async ({ service }) => {
  const item = await service.items.create({ data: { name: "A" } });
  // assertions
});
```

Harness tests require PostgreSQL and apply this module's migrations. Test one
module per process. Test provider definitions and graph validation locally;
test host runtime wiring in an assembled backend integration.

## Validate and publish

```bash
bun run build
bun test
bun run validate
```

Errors block installation. Resolve warnings as well before registry publication.
The backend owner should still inspect `damat module plan` before installing.

## Guardrails

- Bun only; ESM; strict TypeScript.
- Keep every code file at 100 physical lines or fewer.
- Never duplicate generated CRUD.
- Never import another module implementation.
- Never activate cross-module composition from the blade.
- Never store host credentials or policy in the module.
- Update living docs and package release records when behavior changes.
