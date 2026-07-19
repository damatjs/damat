[Damat Guide](../GUIDE.md) › Module capabilities

# 16. Module capabilities

A module is a portable provider of one domain concern. It may contain data,
HTTP, local orchestration, durable definitions, and integration guidance while
remaining independent of the application that installs it.

## 16.1 Portable contract

Every module has a root `damat.json`:

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
    },
  },
  "module": {
    "description": "Stock and reservations.",
    "models": "./src/models",
    "migrations": "./src/migrations",
    "env": [],
    "registry": { "namespace": "acme", "license": "MIT" },
  },
}
```

The manifest can declare provider paths for models, migrations, routes,
workflows, jobs, events, pipelines, links, tests, and generated types. See the
complete [manifest contract](../../MODULES.md).

## 16.2 Standard layout

```text
module/
├── damat.json
├── module.config.ts
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

Optional folders are capabilities, not required ceremony.

## 16.3 Models and migrations

Models come from `@damatjs/orm-model`:

```ts
import { columns, model } from "@damatjs/orm-model";

export const Item = model("items", {
  id: columns.id({ prefix: "itm" }).primaryKey(),
  sku: columns.text().unique(),
  quantity: columns.integer().default(0),
}).timestamps();
```

Relations may target only tables owned by the module. Cross-module identifiers
remain plain columns until the backend owner activates a link.

Module-local migration commands operate without `damat.config.ts`:

```bash
bun run database:setup
bun run migration:create
bun run migration:run
bun run migration:status
```

The setup command creates the development database and applies only the
module's migrations.

## 16.4 Service and generated CRUD

```ts
import { ModuleService } from "@damatjs/services";
import { collectModels } from "@damatjs/orm-model";
import { Item } from "./models/item";

export const models = collectModels([Item]);

export class InventoryService extends ModuleService({ models }) {}
```

Each model receives typed create, upsert, find, update, delete, restore, count,
exists, and transaction behavior. Do not wrap those accessors in duplicate
service methods. Add a service method only for new provider/domain behavior and
put its implementation in small `src/lib/` units.

## 16.5 Credentials

Credentials use a loader and Zod schema:

```ts
import { z } from "@damatjs/deps/zod";

export const schema = z.object({ apiKey: z.string().min(16) });
export const load = (env: NodeJS.ProcessEnv) => ({
  apiKey: env.INVENTORY_API_KEY ?? "",
});
```

Declare the environment key in `damat.json.module.env`. Avoid ad hoc
`process.env` reads elsewhere in module code.

## 16.6 Module entry

```ts
import { defineModule } from "@damatjs/services";
import credentials from "./config";
import { InventoryService, models } from "./service";

export default defineModule("inventory", {
  service: InventoryService,
  credentials: credentials.load,
});

export { InventoryService, models };
```

Codegen writes registry typing so `getModule("inventory")` resolves the service
type in steps and application code.

## 16.7 HTTP and workflow slice

Codegen creates missing CRUD steps, workflows, validators, and routes once. The
layering is:

```text
route → workflow → step → service
```

Routes use `@damatjs/framework/router`, workflows use
`@damatjs/workflow-engine`, and only steps reach the module service. Extend the
generated slice rather than creating a competing CRUD path.

Use workflows for local multi-step behavior whose completed steps must
compensate in reverse on failure. Workflows are in-process sagas, not persisted
outer orchestration.

## 16.8 Durable job providers

A module may export stable job definitions from `src/jobs/`:

```ts
import { defineJob } from "@damatjs/jobs";

export const reconcileStock = defineJob(
  "inventory.reconcile",
  async (input, context) => {
    await context.progress(50);
    return { reconciled: input.itemId };
  },
  { maxAttempts: 5 },
);
```

The backend imports definitions before bootstrap, enables jobs, selects job
workers, and applies system migrations. The module does not choose host queues,
concurrency, retention, or Redis policy.

## 16.9 Event providers

A module may provide typed local events, durable event definitions, and stable
named consumers from `src/events/`.

Use the local bus for in-process reaction, Redis broadcast for optional
cross-process ephemeral reaction, and durable events when each consumer needs
persisted delivery, retries, progress, logs, controls, and recovery.

The backend enables durable events, selects event workers, and applies the
shared/event catalogs.

## 16.10 Pipeline providers

A module may provide durable graphs from `src/pipelines/`:

```ts
import { definePipeline } from "@damatjs/pipelines";

export const restock = definePipeline("inventory.restock", {
  version: 1,
  start: "reserve",
  nodes: [
    { id: "reserve", kind: "job", name: "inventory.reserve" },
    { id: "approval", kind: "signal.wait", signal: "approved" },
  ],
  edges: [{ from: "reserve", to: "approval" }],
});
```

Pipelines persist outer orchestration and may compose jobs, events, workflows,
delays, waits, signals, branches, joins, loops, and bounded children. The
backend owns runtime workers and authenticated visual authoring/inspection
adapters.

## 16.11 Transactions and idempotency

Inside an assembled backend, the executor from `ModuleService.transaction` can
be passed into job enqueue, durable event publish, pipeline start/signal, and
idempotency APIs. Domain data, durable rows, and acceleration outbox entries
then commit or roll back together.

Durable handlers are at least once. Use stable idempotency for database and
external provider effects.

## 16.12 Dormant links

A module may ship a `defineLink` file in `src/links/models/`. It imports no
other module implementation and ships no link migration. The backend owner
reviews, installs, and activates the link with an app-owned migration.

`pairsWith` is a lighter non-binding hint when no concrete link template is
needed.

## 16.13 Standalone harness and runtime

```ts
import { withModule } from "@damatjs/module";

await withModule(module, { moduleDir }, async ({ service }) => {
  // database-backed assertions
});
```

The harness creates one pool, applies the module's migrations, initializes the
service, and guarantees teardown. `damat module dev` runs the same module with
the framework HTTP stack and its routes.

## 16.14 Installation capabilities

Source installation can route each capability independently into the receiver
application. The provider declares `install.provides`; the app declares
`install.accepts`. The installer copies owned files and records provenance but
does not edit shared app config, environment, aliases, barrels, or call sites.

Use `install.instructions` to tell the backend owner what must be registered,
imported, configured, migrated, or removed.

## 16.15 Tooling and readiness

```bash
bun run codegen
bun run typecheck
bun test
bun run build
bun run validate
```

Validation errors block installation. Warnings identify publishing-readiness
gaps. Resolve both before registry publication.

## 16.16 Authoring checklist

- One domain concern.
- Owned models and migrations only.
- Generated CRUD is not duplicated.
- Credentials are declared and validated.
- Optional provider paths match `damat.json`.
- Durable definitions use stable identities.
- Host policy is left to the backend owner.
- Tests, typecheck, build, and validation pass.
- Every code file is 100 lines or fewer.

---

Prev: [← Installing modules with AI](./15-installing-modules-with-ai.md) · [Guide home](../GUIDE.md) · Next: [Composing & linking modules →](./17-composing-and-linking-modules.md)
