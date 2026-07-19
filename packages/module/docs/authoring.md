# Authoring ownership

`@damatjs/module` owns the portable module contract and standalone module
runtime. General application authoring APIs stay with the packages that
implement them.

## Import map

| Concern                       | Import from                 |
| ----------------------------- | --------------------------- |
| module definition and service | `@damatjs/services`         |
| app registry access           | `@damatjs/framework`        |
| route contracts               | `@damatjs/framework/router` |
| model DSL and collection      | `@damatjs/orm-model`        |
| local saga workflows          | `@damatjs/workflow-engine`  |
| durable jobs                  | `@damatjs/jobs`             |
| durable events                | `@damatjs/events`           |
| durable pipelines             | `@damatjs/pipelines`        |
| validation                    | `@damatjs/deps/zod`         |

Use `@damatjs/module` for its owned surfaces:

```ts
import {
  defineModuleConfig,
  validateModuleDir,
  withModule,
} from "@damatjs/module";
```

The package also exports pipeline definitions because the standalone runtime
loads portable pipeline providers. Prefer `@damatjs/pipelines` in module source
so ownership remains explicit.

## Portable module example

```ts
import { defineModule, ModuleService } from "@damatjs/services";
import { collectModels, columns, model } from "@damatjs/orm-model";

const Item = model("items", {
  id: columns.id({ prefix: "itm" }).primaryKey(),
  name: columns.text(),
});

export const models = collectModels([Item]);
export class InventoryService extends ModuleService({ models }) {}

export default defineModule("inventory", {
  service: InventoryService,
});
```

`ModuleService` supplies the model CRUD surface. Steps call those accessors
directly; add service methods only for behavior the generated accessors cannot
express, such as an external provider integration.

## Why ownership is explicit

- Installed source keeps the same imports in a standalone package and backend.
- Dependency requirements are visible in `package.json` and `damat.json`.
- Each package can evolve without turning `@damatjs/module` into a second public
  API for the whole framework.
- Contract/runtime changes remain separate from application authoring changes.

See the [module authoring guide](../../../docs/guide/13-authoring-modules.md) for
the full route → workflow → step → service layout and the
[manifest contract](./manifest.md) for portable capabilities.
