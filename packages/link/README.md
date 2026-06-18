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
have categories, etc. A **link** declares that relationship *outside* both
modules (in `src/links/`), generates a junction table to store it, and exposes a
service to manage and traverse it. Modules stay decoupled; the relationship is
first-class.

## Define a link

```ts
// src/links/user-organization.ts
import { defineLink } from "@damatjs/framework";

export default defineLink(
  { module: "user", model: "user", field: "users" },
  { module: "organization", model: "organization", field: "organizations" },
);
```

`module` is the module id (the `getModule` key); `model` is the **key in that
module's `models` map** (i.e. its service accessor — `user`, not the table
`users`). `field` is the name the side is exposed as in graph queries.

This generates a `user_organization` junction table: `id`, `user_id`,
`organization_id`, timestamps, a soft-delete column, a **unique** index on
`(user_id, organization_id)`, and an index per foreign-key column. No real
cross-module DB foreign keys are emitted by default (module isolation); opt in
with `{ database: { foreignKeys: true } }`.

## Wire it into the app

```ts
// src/links/index.ts
import { defineLinkModule, collectLinkModels } from "@damatjs/framework";
import userOrganization from "./user-organization";

export const links = [userOrganization];
export const models = collectLinkModels(links); // for migrate + codegen
export default defineLinkModule(links);         // registered as the `link` module at boot
```

```ts
// damat.config.ts
export default defineConfig({
  projectConfig: { /* … */ },
  modules: { user: { resolve: "./src/modules/user" }, organization: { resolve: "./src/modules/organization" } },
  links: "./src/links",
});
```

The `links` directory now participates in everything automatically:

```bash
damat-orm migrate:create link    # generate the junction migration
damat-orm migrate:up             # create the junction table
damat-orm generate:types link    # row types + zod for the junction
```

## Query at runtime

`getModule("link")` returns the link service:

```ts
import { getModule } from "@damatjs/framework";
const link = getModule("link");

// Manage links (create is idempotent; dismiss is a soft delete)
await link.create({ module: "user", model: "user", id: u.id }, { module: "organization", model: "organization", id: o.id });
await link.dismiss({ module: "user", model: "user", id: u.id }, { module: "organization", model: "organization", id: o.id });

// Fetch the linked module's records (either direction)
const orgs  = await link.fetch({ module: "user", model: "user", id: u.id }, { module: "organization", model: "organization" });
const users = await link.fetch({ module: "organization", model: "organization", id: o.id }, { module: "user", model: "user" });

// Nested graph query across modules — Damat's analogue of query.graph
const { data } = await link.graph({
  module: "user",
  entity: "user",
  fields: ["id", "email", "organizations.name", "organizations.slug"],
  filters: { id: u.id },
});
// data[0].organizations -> [{ name, slug }, …]
```

## API

| Export | Purpose |
|--------|---------|
| `defineLink(left, right, options?)` | Build a link + its junction model. |
| `collectLinkModels(links)` | The `models` map a links dir exports (for migrate/codegen). |
| `defineLinkModule(links, id?)` | A `defineModule`-compatible link module. |
| `getModule("link")` → `LinkService` | `create` / `dismiss` / `list` / `listLinkedIds` / `fetch` / `graph`. |
| `setLinkModuleResolver(fn)` | Framework-internal: injects `getModule` for hydration. |
| `resolveLinkModuleEntries(links, cwd)` | Framework/CLI-internal: resolves `config.links`. |

See [`docs/README.md`](./docs/README.md) for internals.
