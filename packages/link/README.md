# @damatjs/link

Cross-module **links** for Damat — the bridge that lets isolated modules relate
to one another. A link connects two models that live in **different** modules
through an auto-generated junction table, so neither module has to import the
other. Links migrate and type-generate through the normal pipelines, and you can
create, dismiss, and query them at runtime — Damat's take on Medusa's module
links + `query.graph`.

```
┌── module: user ──┐        ┌─ link (junction) ─┐        ┌── module: organization ─┐
│  users           │  ◄───► │ user_organization │ ◄───►  │  organizations           │
└──────────────────┘        └───────────────────┘        └──────────────────────────┘
        ▲                      getModule("link")                      ▲
        └──────────────  .create / .fetch / .graph  ─────────────────┘
```

## Why

Modules are isolated vertical slices — they don't share tables and can't FK into
each other. But real apps need a user to belong to organizations, a product to
have categories, etc. A **link** declares that relationship _outside_ both
modules (in `src/links/`), generates a junction table to store it, and exposes a
service to manage and traverse it. Modules stay decoupled; the relationship is
first-class.

## Folder layout — links mirror modules

A link is owned by a module and lives under a folder named after it, with the
same shape as a module (`models/`, `index.ts`, `migrations/`):

```
src/links/
├── index.ts                         # aggregates every owner's links into the `link` runtime module
└── user/                            # links owned by the user module
    ├── models/
    │   └── user-organization.ts     # defineLink(...)
    ├── index.ts                     # export links + models (collectLinkModels)
    └── migrations/                  # junction-table migrations for these links
```

```ts
// src/links/user/models/user-organization.ts
import { defineLink } from "@damatjs/framework";

export default defineLink(
  { module: "user", model: "users", field: "users" },
  { module: "organization", model: "organizations", field: "organizations" },
);
```

`module` is the module id (the `getModule` key); `model` is the **key in that
module's `models` map** (i.e. its service accessor — per `collectModels` that
key is the camelCased table name, so the `users` table registers as `users`).
`field` is the name the linked side is exposed as.

**Naming derives from the real table, singularized.** `defineLink` resolves
each side's actual table name (through the global model registry when the
model is loaded, else from the key by the `collectModels` convention) and
derives junction names from its logical singular form — the same `removeLastS`
rule the ORM uses for `mappedBy`. So `users` + `organizations` produce the
`user_organization` junction with `user_id` / `organization_id`, and a
camelCase key like `functionSpaces` contributes `function_space_id`. Override
with `options.pivotTable` and/or `options.pivotColumns: { left, right }`.

> **Import surface.** Links are an **app** concern. Import `defineLink` /
> `collectLinkModels` / `defineLinkModule` from **`@damatjs/framework`** and put
> the definitions in the app's `src/links/`. Module packages don't author links —
> the `@damatjs/module` surface deliberately doesn't expose these helpers.

This generates a `user_organization` junction table: `id`, `user_id`,
`organization_id`, timestamps, a soft-delete column, a **unique** index on
`(user_id, organization_id)`, and an index per foreign-key column. No real
cross-module DB foreign keys are emitted by default (module isolation); opt in
with `{ database: { foreignKeys: true } }` — the FKs then reference each
side's real table and its actual primary key (not a hard-coded `id`) with
`ON DELETE CASCADE`. When the target models aren't importable at definition
time and a side's primary key isn't `id`, set `primaryKey` explicitly on that
endpoint.

```ts
// src/links/user/index.ts — the owner's link module (migrations + discovery)
import { collectLinkModels } from "@damatjs/framework";
import userOrganization from "./models/user-organization";

export const links = [userOrganization];
export const models = collectLinkModels(links);
```

```ts
// src/links/index.ts — aggregate every owner into the single `link` runtime module
import { defineLinkModule } from "@damatjs/framework";
import { links as userLinks } from "./user";

export const links = [...userLinks];
export default defineLinkModule(links);
```

```ts
// damat.config.ts
export default defineConfig({
  projectConfig: {/* … */},
  modules: {
    user: { resolve: "./src/modules/user" },
    organization: { resolve: "./src/modules/organization" },
  },
  links: "./src/links",
});
```

Each owner directory is its own migration module (`link:<owner>`), and the
linked types are generated **into the modules**, not here:

```bash
damat-orm migrate:create link:user   # generate the junction migration (links/user/migrations)
damat-orm migrate:up                 # create the junction table
damat codegen user        # Users gains `organizations?: Organization[]`
damat codegen organization # Organization gains `users?: User[]`
```

## Linked types extend the modules

Links don't generate their own (junction) types. Instead, `damat codegen <module>`
extends each module's entity with the linked module's type — via a sibling
`<table>.links.ts` that merges onto the base interface (the model-generated
`<table>.ts` stays untouched):

`@damatjs/cli-codegen` coordinates this augmentation around
`@damatjs/module-generator`; the base schema files come from
`@damatjs/schema-codegen`.

```ts
// modules/user/types/users.links.ts  (auto-generated)
import type { Organizations } from "../../organization/types";
declare module "./users" {
  interface Users {
    organizations?: Organizations[]; // the actual linked entity, not the junction
  }
}
```

So `Users` carries `organizations`, `Organizations` carries `users`, and
`fetch`/`graph` return those final rows.

## Query at runtime

`getModule("link")` returns the link service:

```ts
import { getModule } from "@damatjs/framework";
const link = getModule("link");

// Manage links. create is idempotent AND race-safe — one INSERT … ON CONFLICT
// against the unique pair index (revives a dismissed link); dismiss soft-deletes.
await link.create(
  { module: "user", model: "users", id: u.id },
  { module: "organization", model: "organizations", id: o.id },
);
await link.dismiss(
  { module: "user", model: "users", id: u.id },
  { module: "organization", model: "organizations", id: o.id },
);

// Fetch the linked module's records (either direction)
const orgs = await link.fetch(
  { module: "user", model: "users", id: u.id },
  { module: "organization", model: "organizations" },
);
const users = await link.fetch(
  { module: "organization", model: "organizations", id: o.id },
  { module: "user", model: "users" },
);

// Nested graph query across modules — Damat's analogue of query.graph
const { data } = await link.graph({
  module: "user",
  entity: "users",
  fields: ["id", "email", "organizations.name", "organizations.slug"],
  filters: { id: u.id },
});
// data[0].organizations -> [{ name, slug }, …]
```

> **Graph scoping.** `graph` only accepts root entities that participate in a
> registered link (nested hops are limited to declared links and the owning
> model's own relations), so the link service is not a read path into
> arbitrary modules' data.

## API

| Export                                 | Purpose                                                              |
| -------------------------------------- | -------------------------------------------------------------------- |
| `defineLink(left, right, options?)`    | Build a link + its junction model.                                   |
| `collectLinkModels(links)`             | The `models` map a links dir exports (for migrate/codegen).          |
| `defineLinkModule(links, id?)`         | A `defineModule`-compatible link module.                             |
| `getModule("link")` → `LinkService`    | `create` / `dismiss` / `list` / `listLinkedIds` / `fetch` / `graph`. |
| `setLinkModuleResolver(fn)`            | Framework-internal: injects `getModule` for hydration.               |
| `resolveLinkModuleEntries(links, cwd)` | Framework/CLI-internal: resolves `config.links`.                     |

See [`docs/README.md`](./docs/README.md) for internals.
