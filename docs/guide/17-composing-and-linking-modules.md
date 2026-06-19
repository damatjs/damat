[Damat Guide](../GUIDE.md) › Composing & linking modules

# 17. Composing & linking modules

A module is a single-purpose **blade**: its own models, service, migrations, and
config, built and tested on its own, never deciding what it gets plugged into.
The **backend owner** — you — is the one who assembles those blades into a
working app. Composition is your job, and it lives in the app, never in a module.

This chapter covers the three ways you combine modules:

1. **Register** them in `damat.config.ts` so the framework boots them.
2. **Call** one from another at runtime with `getModule(id)`.
3. **Link** two independent modules with a junction table, so they relate
   without either one importing the other.

The module author builds the blade; you build the swiss-army knife.

## 17.1 Registering modules

Modules are registered in `damat.config.ts` under the **`modules` object**, keyed
by module id. This is recapped here; the full config reference is in
[Configuration](./04-configuration.md).

```ts
// damat.config.ts
import { defineConfig } from "@damatjs/framework";

export default defineConfig({
  projectConfig: { /* server / db / logging — see ch.4 */ },
  // `modules` is an OBJECT keyed by id (not an array):
  modules: {
    user: { resolve: "./src/modules/user", id: "user" },
    organization: { resolve: "./src/modules/organization", id: "organization" },
  },
});
```

Each entry is a `{ resolve, id? }`: `resolve` is the path to the module folder
(whose `index.ts` default-exports `defineModule(...)`), and `id` is the key
`getModule` resolves it by (it falls back to the folder basename). At boot the
framework calls `initModules(Object.values(config.modules), cwd)`, which imports
each module's default export and constructs its service against the live pool.
`damat module add` writes these entries for you (see
[Installing existing modules](./14-installing-modules.md)).

## 17.2 Runtime composition with `getModule(id)`

`getModule(id)` is how one module *calls* another at runtime — from a route, a
service method, or a workflow step. It returns the target module's service (or
`null` if it isn't registered), with no import of the other module's code:

```ts
import { getModule } from "@damatjs/framework";

// A user-module accessor and an organization-module accessor, side by side:
const users = getModule("user");
const orgs  = getModule("organization");

const user = await users.user.create({ data: { email: "a@b.co" } });
const org  = await orgs.organization.create({ data: { name: "Acme" } });
```

Because the dependency goes through the registry (the id string), not through an
`import`, the two modules stay decoupled — the app is what knows they exist
together. Typing is via the augmentable `ModuleRegistry`; without augmentation,
type the call explicitly: `getModule<UserModuleService>("user")`.

`getModule` gives you a *behavioral* call (run the other module's logic). When
what you need is a persistent **data relationship** between two modules' rows,
reach for a link instead.

## 17.3 Cross-module links

### What a link is

A **link** connects two models that live in **different** modules through an
auto-generated **junction table**, so neither module has to import — or even know
about — the other. The relationship is declared *outside* both modules, in the
app's `src/links/`, and Damat manages and traverses it through a `link` service.

```
┌── module: user ──┐        ┌─ link (junction) ─┐        ┌── module: organization ─┐
│  users           │  ◄───► │ user_organization │ ◄───►  │  organizations           │
└──────────────────┘        └───────────────────┘        └──────────────────────────┘
        ▲                      getModule("link")                      ▲
        └──────────────  .create / .fetch / .graph  ─────────────────┘
```

### When to use one

Use a link when **two independent modules need to relate** and neither should
depend on the other — a user belonging to organizations, a product having
categories. Modules are isolated vertical slices: they don't share tables and
can't foreign-key into each other. A link declares that many-to-many
relationship at the app level, generates a junction table to store it, and gives
you a service to manage and query it. Modules stay decoupled; the relationship is
first-class — and it's yours, the owner's, to define.

> **Why this is an app concern.** A link couples two modules. A module that
> declared its own links would stop being a single-purpose blade and start
> dictating its surroundings. So links live in the **app**, and you import
> `defineLink` / `collectLinkModels` / `defineLinkModule` from
> **`@damatjs/framework`** — the `@damatjs/module` surface deliberately does not
> expose these helpers.

### Define the link

Links **mirror modules**: a link is owned by a module and lives under a folder
named after that owner, with the same shape as a module (`models/`, `index.ts`,
`migrations/`):

```
src/links/
├── index.ts                         # aggregates every owner's links → the `link` module
└── user/                            # links owned by the user module
    ├── models/
    │   └── user-organization.ts     # defineLink(...)
    ├── index.ts                     # export links + models (collectLinkModels)
    └── migrations/                  # junction-table migrations for these links
```

The link itself is a `defineLink(left, right)` of two endpoints:

```ts
// src/links/user/models/user-organization.ts
import { defineLink } from "@damatjs/framework";

export default defineLink(
  { module: "user", model: "user", field: "users" },
  { module: "organization", model: "organization", field: "organizations" },
);
```

Each endpoint is `{ module, model, field }`:

- `module` — the module id (the `getModule` key).
- `model` — the **key in that module's `models` map** (its service accessor,
  e.g. `user`), *not* the database table name (`users`).
- `field` — the name the linked side is exposed as in queries. Defaults to
  `model` if omitted.

This generates a `user_organization` junction table: `id`, `user_id`,
`organization_id`, timestamps, a soft-delete column, a **unique** index on
`(user_id, organization_id)`, and an index per foreign-key column. By default no
real cross-module DB foreign keys are emitted — that preserves module isolation
and keeps the link migration from depending on both modules' ordering. Opt in
with `defineLink(left, right, { database: { foreignKeys: true } })`; you can also
override the table name with `{ pivotTable: "..." }` or add columns with
`{ database: { extraColumns: { … } } }`.

### The owner index and the aggregator

Each owner directory exports its `links` and the `models` map that migrations and
codegen read (`collectLinkModels`):

```ts
// src/links/user/index.ts — the owner's link module (migrations + discovery)
import { collectLinkModels } from "@damatjs/framework";
import userOrganization from "./models/user-organization";

export const links = [userOrganization];
export const models = collectLinkModels(links);
```

The top-level aggregator pulls every owner's `links` together and default-exports
the single `link` runtime module:

```ts
// src/links/index.ts — aggregate every owner into the single `link` module
import { defineLinkModule } from "@damatjs/framework";
import { links as userLinks } from "./user";

export const links = [...userLinks];
export default defineLinkModule(links);
```

### Wire it into config

Point the config's `links` field at the directory. It is a **directory path**,
not a module map — a single path or an array of them. The framework turns it into
a `link` module entry and boots it alongside the rest, so no manual `modules`
entry is needed:

```ts
// damat.config.ts
export default defineConfig({
  projectConfig: { /* … */ },
  modules: {
    user: { resolve: "./src/modules/user" },
    organization: { resolve: "./src/modules/organization" },
  },
  links: "./src/links",
});
```

### Migrate and regenerate types

Each **owner** directory is its own migration module, named `link:<owner>`. Create
and apply the junction migration per owner, then regenerate the types of the
**linked modules** (not the link dir — junction tables get no generated types):

```bash
damat-orm migrate:create link:user    # generate the junction migration (links/user/migrations)
damat-orm migrate:up                  # create the junction table
damat-orm generate:types user         # Users gains `organizations?: Organizations[]`
damat-orm generate:types organization # Organizations gains `users?: Users[]`
```

`generate:types <module>` writes a sibling `<table>.links.ts` next to the
module's generated row types that merges the linked entity onto the base
interface (the model-generated `<table>.ts` stays untouched):

```ts
// src/modules/user/types/users.links.ts  (auto-generated)
import type { Organizations } from "../../organization/types";

declare module "./users" {
  interface Users {
    organizations?: Organizations[];   // the linked entity, not the junction row
  }
}
```

So `Users` carries `organizations`, `Organizations` carries `users`, and
`fetch`/`graph` return those final module rows.

### Use the link at runtime

`getModule("link")` returns the link service — one service over every owner's
links:

```ts
import { getModule } from "@damatjs/framework";
const link = getModule("link");

// Manage links (create is idempotent; dismiss is a soft delete)
await link.create(
  { module: "user", model: "user", id: u.id },
  { module: "organization", model: "organization", id: o.id },
);
await link.dismiss(
  { module: "user", model: "user", id: u.id },
  { module: "organization", model: "organization", id: o.id },
);

// List linked rows on either side
const orgs  = await link.fetch(
  { module: "user", model: "user", id: u.id },
  { module: "organization", model: "organization" },
);
const users = await link.fetch(
  { module: "organization", model: "organization", id: o.id },
  { module: "user", model: "user" },
);
```

`create` find-or-restore-or-creates against the unique pair index, so it's
idempotent and re-creating a dismissed link revives it; `dismiss` soft-deletes by
setting `deleted_at`. The full service surface is
`create` / `dismiss` / `list` / `listLinkedIds` / `fetch` / `graph`.

#### Graph queries across modules

`link.graph(...)` is Damat's analogue of a cross-module graph query: you ask for
fields on a starting entity and follow link fields into other modules using
**dotted field paths**. It fetches per hop through each module's own service
(respecting isolation), rather than issuing cross-module SQL joins:

```ts
const { data } = await link.graph({
  module: "user",
  entity: "user",
  fields: ["id", "email", "organizations.name", "organizations.slug"],
  filters: { id: u.id },
});
// data[0].organizations -> [{ name, slug }, …]
```

A path segment that matches a link's far-side `field` (here `organizations`)
crosses the link into the other module — to any depth. Use `"*"` for all columns
of a node (e.g. `["*", "organizations.*"]`).

For the link service internals and junction-table shape, see the
[`@damatjs/link` README](../../packages/link/README.md) and its
[internals doc](../../packages/link/docs/README.md).

## 17.4 Reading a module's signals

A module can hint at how it likes to be composed, but those hints are **advice to
you**, never commands — composition stays the owner's decision (see the
[module manifest contract](../../MODULES.md)):

- **`pairsWith`** — a non-binding hint listing modules this one pairs well with.
  It's a comment for the backend owner: never enforced, never auto-installed. A
  user module that lists `"pairsWith": ["organization"]` is *suggesting* you might
  want to install the organization module and link the two — but whether you do,
  and how you link them, is entirely up to you.
- **`modules`** — a **rare** hard dependency on other modules. Even then it only
  *warns* at install time if a listed module is missing; it does not install
  anything for you. A well-built module stays self-contained and prefers
  `pairsWith`; `modules` is an escape hatch for genuine hard dependencies.

So when you install a module and see `pairsWith`, treat it as a tip: it's telling
you which other blade tends to fit alongside this one. You decide what to install
and what to link.

---

Prev: [← Module capabilities](./16-module-capabilities.md) · [Guide home](../GUIDE.md) · Next: [CLI reference →](./18-cli-reference.md)
