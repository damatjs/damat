[Damat Guide](../GUIDE.md) › Authoring a module

# 13. Authoring a module

A Damat module is a **single-purpose blade**: one self-contained vertical slice
of a backend — its own models, migrations, service, config, and (optionally)
workflows and routes. It does **one thing**, and it does it without knowing what
app it will live in. You build it, test it, and ship it on its own, with no
backend app around it. That is what [`@damatjs/module`](../../packages/module/README.md)
enables, and it's how every shareable module is made.

This chapter is the module **author's** guide. It walks the full loop — scaffold,
write, test, package, validate — and stops at the package boundary. It does
**not** cover installing a module, wiring it into an app's config, or linking it
to another module; that work belongs to the **backend owner** and is covered in
[ch. 17 — Composing & linking modules](./17-composing-and-linking-modules.md)
and the `damat-backend` skill. For the complete catalogue of what a module's
authoring surface can express, see
[ch. 16 — Module capabilities](./16-module-capabilities.md).

## What a standalone module is — and why

A module is **independent on purpose**. Everything it needs to run lives inside
the package, and everything outside it is somebody else's decision:

- **Independent.** It defines its own schema, owns its own migrations, and reads
  only its own config and env vars. It never imports another module, never
  reaches into another module's tables, and never declares "I need X installed."
- **Testable.** Because it carries its own migrations and a credentials loader,
  the harness can boot it against a real Postgres — no server, no app — and you
  can exercise the service directly.
- **Shippable.** A `module.json` manifest next to its entry file makes it
  portable: `damat module add <source>` can drop it into any Damat app, register
  it, sync its env vars, and install its npm dependencies.

Keeping a module narrow is the whole point. A module that tries to wire itself
into other modules stops being shareable — it can now only live in the one app
that has those other modules. Stay in your lane, and your blade slots into any
app.

## Scaffold and develop

Start a fresh module package with `damat module init` — an offline local
scaffold, generated from built-in templates:

```bash
bunx @damatjs/damat-cli@latest module init my-module
# or, with the CLI already installed:
damat module init my-module
```

Then run it as a live app on its own server:

```bash
cd my-module
damat module dev                 # run the module as a live app (its own HTTP server)
```

`damat module dev` boots the framework's full HTTP stack with **only this
module** registered: middleware, health checks, and any file-based routes under
`api/routes`. It applies the module's migrations first (when `DATABASE_URL` is
set), then serves. By default it binds port `7654` (override with `PORT`, a
`module.config.ts` `http.port`, or the CLI). This is the runtime described in
[the module package internals](../../packages/module/docs/runtime.md) — the same
machinery you use to smoke-test routes before the module ever joins an app.

## The single authoring import

A module package's only direct dependency is `@damatjs/module`. It re-exports
everything you need to author a module from one place, so your code imports
**names**, not a fan of sibling packages:

```ts
import {
  defineModule,        // define the module + its service
  ModuleService,       // service base with generated model accessors
  model, columns,      // the ORM model DSL
  z,                   // zod, for credential + request validation
  createWorkflow, createStep, parallel, when, ifElse, RetryPolicies, Effect, // workflows
  type RouteHandler, type RouteValidator, // HTTP route contracts
} from "@damatjs/module";
```

What is **deliberately not** in this surface: **link helpers**. `@damatjs/module`
has no `defineLink`, and a module's **models** never declare a relationship to
another module's tables. A module may still *ship* a **dormant** link file under
`src/links/models/` (a `defineLink` imported from `@damatjs/framework`) that the backend
owner activates by migrating — but it never imports the other module and never creates the
connection itself (see [Ship a cross-module link template](#ship-a-cross-module-link-template-dormant)
below). Composition stays the app's job (see
[ch. 17](./17-composing-and-linking-modules.md)). The authoring surface is the
full reference; see [authoring.md](../../packages/module/docs/authoring.md).

## Package structure

A standalone module package looks like this:

```
my-module/
├── module.json            # the portable manifest (the contract for `damat module add`)
├── module.config.ts       # optional: standalone-app overrides for `damat module dev`
├── package.json           # the module's own npm deps (just @damatjs/module + its packages)
└── src/
    ├── index.ts           # default-exports defineModule(...)
    ├── service.ts         # the ModuleService subclass + the models map
    ├── models/            # ORM model definitions
    ├── config/            # credentials loader + credentials schema
    ├── migrations/        # SQL migrations (generated) + schema snapshot
    ├── types/             # generated row types + zod schemas
    ├── links/models/      # optional: dormant cross-module link TEMPLATES (defineLink)
    ├── workflows/         # optional: workflow + step definitions
    └── api/routes/        # optional: file-based HTTP routes
```

### Entry, service, and models

The entry file defines the module and points it at its service and credentials
loader:

```ts
// src/index.ts
import { defineModule } from "@damatjs/module";
import { UserModuleService, models } from "./service";
import credentials from "./config";

export { UserModuleService, models };

export default defineModule("user", {
  service: UserModuleService,
  credentials: credentials.load,
});
```

The service subclasses `ModuleService({ models, credentialsSchema })`. The base
generates a typed accessor per model (`service.user.create(...)`,
`service.user.exists(...)`, …); you add your own methods on top:

```ts
// src/service.ts
import { ModuleService } from "@damatjs/module";
import { UserModel, AccountModel, SessionModel } from "./models";
import { schema } from "./config/schema";

export const models = {
  user: UserModel,
  account: AccountModel,
  session: SessionModel,
};

export class UserModuleService extends ModuleService({
  models,
  credentialsSchema: schema,
}) {}
```

Models use the `model`/`columns` DSL:

```ts
// src/models/user.ts
import { model, columns } from "@damatjs/module";

export const UserModel = model("users", {
  id: columns.id({ prefix: "usr" }).primaryKey(),
  email: columns.text().unique(),
  emailVerified: columns.boolean().default(false),
  name: columns.text().nullable(),
}).indexes([columns.indexes().columns(["email"]).unique()]);
```

### Intra-module relations only — never another module's tables

Relations **inside** your module are real foreign keys, referenced by table
name:

```ts
// src/models/account.ts — belongs to this module's `users` table
account: model("accounts", {
  id: columns.id({ prefix: "acc" }).primaryKey(),
  user: columns.belongsTo("users").link({ foreignKey: "user_id" }).indexed(),
});
```

When a model conceptually points at **another module's** row, it is **not** a
foreign key — it's a plain column holding the id, with no relation:

```ts
// References some other module's user — cross-module, so a plain id column, NOT an FK
userId: columns.text(),
```

This keeps your migrations self-contained: nothing in your schema depends on a
table your module doesn't own. The actual cross-module relationship (a junction
table, link graph, cascade behavior) is something the backend owner declares in
the app, never something the module bakes in.

### Ship a cross-module link template (dormant)

A module can't foreign-key into another module's tables — but it **can ship the connection
as a dormant link template** so the backend wires it in one step instead of hand-authoring
it. Drop a real `defineLink` file under **`src/links/models/<from>-<to>.ts`**:

```ts
// src/links/models/checks-customer.ts
import { defineLink } from "@damatjs/framework";

export default defineLink(
  { module: "check", model: "checks", field: "checks" },                       // → customer.checks: Checks[]
  { module: "customer", model: "customer", field: "customer", isList: false }, // → check.customer: Customer
);
```

Each endpoint is `{ module, model, field?, primaryKey?, isList? }`:

- `module` — the target module id (the `getModule` key).
- `model` — the **key in that module's `models` map** (the service accessor, e.g. `checks`),
  not the database table name.
- `field` — how the linked side is exposed when traversing (defaults to `model`).
- `isList` — whether that side is a list on the other (default `true`; set `false` for the
  to-one side, e.g. a check has one `customer`).
- `primaryKey` — the target column the link keys on (default `"id"`; set e.g. `"sku"` to link
  by a natural key).

`defineLink` comes from **`@damatjs/framework`** (the dep your module already has) — it is
deliberately **not** in the `@damatjs/module` surface, because a link is normally the app's
call. The file **imports nothing from the other module and creates nothing**: it names the
target by module id + accessor key, nothing more.

The template's life, in three stages:

1. **You ship it (dormant).** It sits in `src/links/models/` and does nothing —
   your module still builds, tests, and validates with no knowledge of the
   other module.
2. **Install splits it out.** `damat module add` copies it into the app's
   `src/links/<moduleId>/models/`, regenerates the owner index + top-level
   aggregator, and ensures `links: "./src/links"` in `damat.config.ts`. Still
   dormant — you ship **no link migration**.
3. **The backend owner activates it** — `damat-orm migrate:create link:<id>` →
   `migrate:up` → `damat codegen`. Until then the link is inert, and it stays
   harmless even if the target module isn't installed.

This complements `pairsWith`: `pairsWith` *names* a module to pair with, a
shipped link *describes the exact connection* — both non-binding, both
deletable by the app owner. Full activation flow:
[ch. 17.3 — Links shipped by a module](./17-composing-and-linking-modules.md#links-shipped-by-a-module).

### Config: credentials loader + schema

A module reads only its own env, through a credentials loader. The loader maps
env vars to a typed credentials object; the schema validates it:

```ts
// src/config/load.ts
export const load = (env: NodeJS.ProcessEnv) => ({
  apiKey: {
    secret: env.API_KEY_SECRET,
    prefix: env.API_KEY_PREFIX || "dmk",
  },
});
```

Every env var the loader reads should be declared in `module.json`'s `env` array
so installs can sync `.env.example` and warn about anything missing.

## The tooling loop

As you change models, regenerate migrations and types. Both commands operate on
the module package directly — no `damat.config.ts` required:

```bash
damat module migration:create   # diff models against the last snapshot -> a new migration
damat module migration:run       # apply this module's migrations to DATABASE_URL
damat module migration:status    # show this module's applied vs pending migrations
damat module codegen            # generate row types + zod schemas into types/
```

`migration:create` writes a migration only when the models actually differ from
the recorded snapshot; if they already match, nothing is written. To test the
module against a real database, set `DATABASE_URL` in your `.env` and run
`migration:run` — it connects, applies only this module's migrations (tracked
under the module's name, so it's idempotent), and disconnects; `migration:status`
reports which are applied vs pending. `codegen` overwrites the `types/`
directory — treat it as generated output, not hand-edited source. Details on
these are in [tooling.md](../../packages/module/docs/tooling.md).

## Test it in isolation with the harness

The harness boots your module against a real Postgres with **no app and no
server**: it wires the same connection/pool infrastructure the framework uses,
applies the module's own migrations, calls `init()`, and hands you the
`service` for direct calls. Use `withModule` so teardown is guaranteed:

```ts
import { withModule } from "@damatjs/module";
import userModule from "./index";

await withModule(userModule, { moduleDir: import.meta.dir }, async ({ service }) => {
  await service.user.create({ data: { email: "a@b.co" } });
  expect(await service.user.exists({ where: { email: "a@b.co" } })).toBe(true);
});
```

In a test file, gate database-backed tests so they skip cleanly where there's no
Postgres, and validate the manifest itself with `validateModuleDir`:

```ts
import { bootModule, validateModuleDir, type BootedModule } from "@damatjs/module";
import type { UserModuleService } from "../service";

const MODULE_DIR = join(import.meta.dir, "..");

// The credentials loader reads env at init — provide a test value so it can boot.
process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret!!";

test("module directory passes registry validation", () => {
  const report = validateModuleDir(MODULE_DIR);
  expect(report.errors).toEqual([]);
  expect(report.valid).toBe(true);
});

describe.skipIf(!process.env.DATABASE_URL)("user module (standalone boot)", () => {
  let booted: BootedModule<UserModuleService>;
  beforeAll(async () => {
    const { default: userModule } = await import("../index");
    booted = await bootModule(userModule, { moduleDir: MODULE_DIR });
  });
  afterAll(async () => { await booted?.teardown(); });

  test("creates and finds a user", async () => {
    await booted.service.user.create({ data: { email: "harness@example.test" } });
    expect(await booted.service.user.exists({ where: { email: "harness@example.test" } })).toBe(true);
  });
});
```

Notes that matter:

- The harness needs a real Postgres (`DATABASE_URL`, or pass `{ databaseUrl }` /
  `{ database }`). Gate DB tests with `describe.skipIf(!process.env.DATABASE_URL)`.
- The pool is global, shared state — boot and tear down **one** module at a time;
  don't run two booted modules concurrently in one process.
- For pure-service tests against an existing schema, omit `moduleDir` to skip
  migrations.

The full harness contract (`bootModule`, `withModule`, options, teardown) is in
[harness.md](../../packages/module/docs/harness.md).

## Package it: `module.json`

Ship a `module.json` next to your entry file. It is the contract
`damat module add` reads to copy the source in, register it, sync env vars, and
install npm packages. Keep it focused on **what this module is and needs** — not
on what it should be wired to.

```jsonc
{
  "name": "user",                 // module id: registry key + default dir name (kebab-case)
  "version": "0.2.0",             // semver
  "description": "Auth, sessions and accounts.",
  "author": "Abel <a@b.co>",      // string OR { name, email?, url? }

  "env": [                        // every env var the credentials loader reads
    {
      "name": "BETTER_AUTH_SECRET",
      "required": true,
      "description": "Min 32-char secret for Better Auth",
      "example": "change-me-min-32-characters-long"   // written to .env.example
    }
  ],
  "packages": {                   // npm packages the host app must install
    "better-auth": "^1.4.18"      //   name -> semver range
  },

  "pairsWith": ["organization"],  // NON-BINDING hint: a comment for the backend owner

  "registry": {                   // publishing metadata
    "namespace": "damatjs",
    "keywords": ["auth", "users"],
    "license": "MIT"
  }
}
```

`name` is more than a label: it is the registry key, the default install
directory name, **and** the module's migration namespace, so make it globally
meaningful. `packages` is a name → semver-**range** map (npm deps), distinct from
module relationships. The full field reference is in
[MODULES.md](../../MODULES.md) and
[manifest.md](../../packages/module/docs/manifest.md).

### Stay self-contained: `pairsWith`, not hard deps

A module that pairs naturally with another should **suggest** the pairing, not
require it. Leave a non-binding `pairsWith` hint — it is a comment for the
backend owner, never enforced and never installed:

```jsonc
"pairsWith": ["organization"]   // "this works nicely alongside the organization module"
```

There is a `modules` field for genuine **hard** dependencies, but reach for it
only when your module truly cannot function without another. Prefer `pairsWith`:
it keeps your blade independent and installable on its own, and leaves the
decision of whether to actually install and connect the pair to the app owner.

```jsonc
// Avoid unless it's a real, unavoidable dependency:
// "modules": ["organization"]
```

## Build it for release

`damat module build` is the release gate. A module ships as source (no bundle),
so "build" means it must **compile** and be a **valid, installable** module:

```bash
damat module build               # type-check (tsc --noEmit) + contract validate
```

It type-checks the whole module first (fails on any type error), then runs the
same contract + registry-readiness check as `damat module validate`. Skip a step
with `--no-typecheck` / `--no-validate` when you only want one.

The validate pass runs two checks. **Errors** block installing (missing entry,
broken manifest) — fix these first. **Warnings** block publishing (missing
version, license, namespace, …) — clear them so the module is registry-ready even
before a hosted registry exists. The same check is available programmatically as
`validateModuleDir`, which is worth asserting on in your test suite (see above).

## Stay in your lane

The module author's job ends at the package boundary. A module is a single,
self-contained blade:

- **No model-level links.** Your models reference only your own tables; cross-module
  references are plain id columns, not foreign keys. (You *may* ship a **dormant**
  `defineLink` template under `src/links/models/` for the owner to activate — it imports
  nothing from the other module and creates nothing until migrated. See the
  [link-template section](#ship-a-cross-module-link-template-dormant) above and ch. 17.)
- **No imports of other modules**, and **no activating a link yourself**. Whether and
  when a shipped link is turned on is the backend owner's call.
- **Don't decide composition.** Whether your module is installed, what it's
  connected to, and how, is the **backend owner's** call.
- **Do leave a `pairsWith` hint** when a pairing is natural — a suggestion, not a
  requirement.

For the full surface a module *can* express on its own (models, services,
workflows, routes, config), see
[ch. 16 — Module capabilities](./16-module-capabilities.md). For installing,
wiring, and linking modules together in an app, see
[ch. 17 — Composing & linking modules](./17-composing-and-linking-modules.md)
and the `damat-backend` skill.

---

Prev: [← The default backend](./12-default-backend.md) · [Guide home](../GUIDE.md) · Next: [Installing existing modules →](./14-installing-modules.md)
