[Damat Guide](../GUIDE.md) › Authoring a module

# 13. Authoring a standalone module

A Damat module is a single-purpose, portable domain blade. It owns its models,
migrations, service, credentials, and optional capability providers. It does not
choose the host application's modules, links, workers, Redis policy, retention,
authentication, or deployment shape.

This chapter stops at the package boundary. Installing and composing the module
belongs to the backend owner and starts in
[Installing modules](./14-installing-modules.md).

## Scaffold and database setup

```bash
bunx @damatjs/damat-cli@latest module init inventory
cd inventory
bun run dev
```

The initializer accepts a complete PostgreSQL URL or asks for host, port, user,
hidden password, and database name. It writes `.env`, installs dependencies,
creates the development database, and applies this module's migrations.

For automation, pass `--database-url` or the individual `--database-*` flags.
Use `--no-install` or `--no-database-setup` only when deliberately deferring
those phases.

The generated scripts are:

```bash
bun run database:setup    # create DB + apply only this module's migrations
bun run migration:create # generate migration from model changes
bun run migration:run    # apply only this module's pending migrations
bun run migration:status
bun run codegen
bun run validate
bun run build
bun run dev               # capability-aware local server and workers
bun test
```

The explicit setup/migration commands remain module-scoped. `bun run dev`
creates the database when required, applies this module plus only the system
catalogs required by declared durable capabilities in one pass, and starts
local workers with development defaults. It prints the bound URL and `/api`
mount after listening, including with `LOG_LEVEL=fatal`.

Installed modules supply definitions only. The assembled backend owns
production migrations, worker roles, queues, concurrency, Redis, retention,
and operational policy.

## Package shape

```text
inventory/
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

Optional capability folders do not need placeholder code. Keep `damat.json`
paths synchronized with what the package intentionally provides.

## Codegen-first loop

1. Add one model per file.
2. Include the models with `collectModels([...])`.
3. Run `bun run migration:create` and review the SQL.
4. Run `bun run database:setup` or `migration:run`.
5. Run `bun run codegen`.
6. Extend the generated workflow/step/route slice in place.
7. Add only behavior that generated CRUD does not provide.
8. Test, build, and validate.

Codegen replaces generated row types, Zod schemas, and registry typing. CRUD
workflows and routes are scaffolded once, then preserved. Do not build a second
CRUD path beside the generated one.

## Models and service

Import from the package that owns each API:

```ts
import { defineModule, ModuleService } from "@damatjs/services";
import { collectModels, columns, model } from "@damatjs/orm-model";
import { z } from "@damatjs/deps/zod";
```

Relations may target only tables owned by this module and use the target table
name. A conceptual reference to another module is a plain identifier, not a
foreign key.

`ModuleService({ models })` supplies the typed CRUD accessors and transactions.
A plain-CRUD module correctly has an empty service subclass. Never add a method
that merely forwards to `find`, `create`, `update`, or another generated
accessor. Put genuinely new provider/domain implementations in small `src/lib/`
files and expose only the intentional service method.

## Layering

Use one direction:

```text
route → workflow → step → service → accessor/provider
```

Routes validate and shape HTTP. Workflows orchestrate local compensation. Steps
perform work. Services expose data access and intentional integrations.

Portable code uses `@<module>/*` for files that remain inside the module,
`@workflows` for the generated workflow barrel, and relative imports between
workflow siblings. Never use the host-owned `@/` alias in module code.

## Optional capability providers

A module may ship:

- routes and local workflows;
- durable job definitions;
- event definitions and stable named consumers;
- durable pipeline definitions;
- dormant link templates;
- tests and generated types.

Definitions must be importable before backend bootstrap. The module does not
select the host runtime, queues, concurrency, retention, Redis, or operational
routes. Record required host wiring in `install.instructions`.

Standalone development detects these declarations from `damat.json`, loads
custom provider paths, and runs their PostgreSQL-backed workers locally. A
database-backed module without `DATABASE_URL` fails before provider imports;
service-only modules skip PostgreSQL even if a stray URL exists.

A pipeline may invoke a workflow as one node. Use workflows for local sagas and
pipelines for persisted outer orchestration that waits, branches, survives
restarts, or needs complete operational visibility.

## Credentials

Read module credentials through `src/config/load.ts`, validate them with the
module schema, and declare every key in `damat.json.module.env`. Do not read
`process.env` ad hoc inside services, workflows, jobs, events, or pipelines.

## Manifest

`damat.json` describes identity, install capabilities, paths, environment, and
registry metadata:

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

Use `pairsWith` instead of a hard dependency unless the dependency is truly
unavoidable. The full contract is [MODULES.md](../../MODULES.md).

## Dormant links

A module may ship `src/links/models/<from>-<to>.ts` using `defineLink` from
`@damatjs/framework`. It imports no other module implementation and ships no
link migration. The backend owner reviews it, decides whether to keep it, and
creates the link migration.

## Test in isolation

```ts
import { withModule } from "@damatjs/module";
import inventory from "../src";

await withModule(inventory, { moduleDir }, async ({ service }) => {
  const item = await service.items.create({ data: { name: "A" } });
  // assertions
});
```

The harness uses a real PostgreSQL database, applies the module's declared
migration path and the local catalogs required by its durable capabilities,
and owns its pool lifecycle. Test one module per process. Use `startModuleApp({
port: 0 })` when an integration test also needs standalone routes and local
durable workers; production policy still belongs in a backend integration.

## Validate and share

```bash
bun run build
bun test
bun run validate
```

Errors block installation. Resolve warnings too before publishing. The backend
owner should still inspect `damat module plan <source>` before installation.

---

Prev: [← The default backend](./12-default-backend.md) · [Guide home](../GUIDE.md) · Next: [Installing modules →](./14-installing-modules.md)
