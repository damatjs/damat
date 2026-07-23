# @damatjs/module

Contracts and runtime tooling for standalone Damat modules: `damat.json`
normalization, module-local config, PostgreSQL harness/runtime, migration and
codegen helpers, artifact resolution, registry validation, and trust policy.

Part of the [Damat monorepo](../../README.md) · [Guide](../../docs/GUIDE.md) ·
[Internals](./docs/README.md) · [Manifest contract](../../MODULES.md)

## Install

```bash
bun add @damatjs/module
```

A generated module also depends directly on the packages that own its authoring
APIs: services, framework/router, ORM model, workflow engine, deps, durability,
events, jobs, and pipelines.

## What this package owns

| Surface                                          | Purpose                                       |
| ------------------------------------------------ | --------------------------------------------- |
| `readModuleManifest`, `validateModuleManifest`   | Read and normalize a module `damat.json`      |
| `resolveModuleEntry`, `resolveModuleArtifact`    | Resolve source or packaged runtime locations  |
| `defineModuleConfig`, `loadModuleConfig`         | Type and load `module.config.ts`              |
| `bootModule`, `withModule`                       | Run a module against PostgreSQL without HTTP  |
| `startModuleApp`, `runModuleEntry`               | Run one module with the framework HTTP stack  |
| `createModuleMigration`, `generateModuleTypes`   | Module-local migration and codegen tooling    |
| `runModuleMigration`, `runModuleMigrationStatus` | Apply or inspect only the module's migrations |
| `parseModuleRef`, `formatModuleRef`              | Address registry modules                      |
| `validateModuleDir`                              | Installation and publishing readiness         |
| registry resolution/verification APIs            | Resolve trusted registry sources              |
| pipeline exports                                 | Portable pipeline provider authoring          |

Most authoring symbols come from their real owners:

```ts
import { defineModule, ModuleService } from "@damatjs/services";
import { getModule } from "@damatjs/framework";
import type { RouteHandler } from "@damatjs/framework/router";
import { collectModels, columns, model } from "@damatjs/orm-model";
import { createStep, createWorkflow } from "@damatjs/workflow-engine";
import { defineJob } from "@damatjs/jobs";
import { defineDurableEvent } from "@damatjs/events";
import { definePipeline } from "@damatjs/pipelines";
import { z } from "@damatjs/deps/zod";
```

## Scaffold a module

```bash
bunx @damatjs/damat-cli@latest module init inventory
cd inventory
bun run dev
```

Initialization collects PostgreSQL credentials, writes `.env`, installs
dependencies, creates the development database, and applies only this module's
migrations. Generated scripts expose the phases separately:

```bash
bun run database:setup
bun run migration:create
bun run migration:run
bun run migration:status
bun run codegen
bun run validate
bun run build
bun test
```

`bun run dev` is exactly `damat module dev`. It creates the configured database
when needed, runs one migration pass for the module plus the system catalogs
required by its declared jobs/events/pipelines, starts local workers, and prints
readiness after HTTP binds even when application logs are suppressed. Fixed
ports are checked before database or module startup; pass `--port 0` for an
ephemeral port. Source reloads stop the current HTTP server and workers before
starting the next runtime, so durable worker registrations do not accumulate.
Foreground Ctrl-C shutdown is acknowledged to the watcher before asynchronous
cleanup, preventing a duplicate forwarded SIGINT from abandoning active worker
records.

The explicit `database:setup` and `migration:*` commands remain module-scoped.
Installed modules supply durable definitions only; the assembled backend owns
production migrations, workers, queues, concurrency, Redis, and operations.

Migration creation, migration run/status, and codegen resolve the manifest's
declared `models`, `migrations`, `types`, `workflows`, and `routes` paths. The
standard root-manifest scaffold therefore keeps every generated artifact under
`src/` while legacy sibling-entry modules continue to work.

## Harness

```ts
import { withModule } from "@damatjs/module";
import inventory from "../src";

await withModule(inventory, { moduleDir }, async ({ service }) => {
  const item = await service.items.create({ data: { name: "A" } });
  // assertions
});
```

The harness resolves database configuration, creates one pool, applies the
module's declared migration path plus the local system catalogs required by
declared durable capabilities, initializes the module, and guarantees teardown.
Migration failure rejects boot and closes both shared pool state and the
connection.

## Portable capabilities

A module manifest may describe models, migrations, routes, workflows, jobs,
events, pipelines, links, tests, and types. Installation moves those named
capabilities; the backend owner still owns shared config, aliases, environment,
barrels, imports, worker selection, migrations, and operational policy.

See [MODULES.md](../../MODULES.md) for the complete schema and ownership model.

## Documentation

- [Internals index](./docs/README.md)
- [Manifest internals](./docs/manifest.md)
- [Harness](./docs/harness.md)
- [Runtime](./docs/runtime.md)
- [Tooling](./docs/tooling.md)
- [Registry](./docs/registry.md)
- [Authoring guide](../../docs/guide/13-authoring-modules.md)

## License

MIT
