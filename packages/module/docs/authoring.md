# Authoring surface

Source: `src/authoring.ts`.

`authoring.ts` is a pure re-export module. Its job is to give a module package a
**single import** for everything it needs, so the only direct dependency the
module's `package.json` declares is `@damatjs/module`. This insulates module code
from the versions of the sibling packages underneath.

## What it re-exports

```ts
// Module definition + service base — from @damatjs/services
export { defineModule, ModuleService };
export type { ModuleDefinition, ModuleInstance, ModuleRegistry };

// App-side registry access — from @damatjs/framework
export { getModule, hasModule, registerModule };

// Cross-module links — from @damatjs/framework
export { defineLink, collectLinkModels, defineLinkModule };
export type {
  LinkService, LinkDefinition, LinkEndpoint,
  LinkOptions, LinkRowRef, LinkModelRef,
};

// ORM model DSL — from @damatjs/orm-model
export { model, columns };

// Workflow engine — from @damatjs/workflow-engine
export {
  createStep, createWorkflow, executeStep, runStep, skipStep,
  parallel, when, ifElse, RetryPolicies, Effect,
};

// HTTP route contracts — from @damatjs/framework/router
export type { RouteHandler, RouteValidator };

// Validation — from @damatjs/deps/zod
export { z };
```

Because `src/index.ts` does `export * from "./authoring"`, all of the above are
also available straight from `@damatjs/module`.

## Typical module file

```ts
import {
  defineModule,
  ModuleService,
  model,
  columns,
  z,
} from "@damatjs/module";

const models = {
  user: model("user", {
    id: columns.uuid().primaryKey(),
    email: columns.text().unique(),
  }),
};

const credentialsSchema = z.object({ apiKey: z.string() });

export class UserModuleService extends ModuleService({ models, credentialsSchema }) {
  // custom methods on top of the generated model accessors
}

export default defineModule("user", {
  service: UserModuleService,
  credentials: () => ({ apiKey: process.env.USER_API_KEY! }),
});
```

`defineModule(...)` returns the object the harness and runtime consume — it has at
least `name`, `service`, and `init()` (see `BootableModule` in
[harness.md](./harness.md)).

## Why this is a separate file

- **Stable surface.** Authors import names, not packages. The underlying packages
  can be re-organized without touching module code.
- **Curated.** Only the workflow helpers and ORM/validation pieces a module
  actually needs are surfaced — not the entire API of each sibling package.
- **`Effect` is re-exported** so authoring workflows inside a module needs no
  direct `effect` dependency.

## Gotchas

- This file has no logic — adding behavior here is a smell. If a re-export needs
  wrapping, do it in the owning package.
- Workflow exports here mirror `@damatjs/workflow-engine`; keep them in sync if
  that package's public surface changes (see
  [workflow-engine internals](../../workflow-engine/docs/README.md)).
- Route types come from the `@damatjs/framework/router` subpath; the file-based
  routes themselves live in the module's `api/routes` dir (served by the runtime).
- The cross-module link helpers (`defineLink` / `collectLinkModels` /
  `defineLinkModule` and the `Link*` types) are re-exported from
  `@damatjs/framework` so app and standalone-module code share one link authoring
  surface. The links themselves live in the app's `src/links/`. See
  [`@damatjs/link`](../../link/README.md).
