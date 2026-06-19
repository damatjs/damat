---
name: damat-modules
description: >-
  Work with the Damat module system — install existing modules into a Damat app,
  author new ones, and relate them with cross-module links. Use when the user
  wants to add/install/find a Damat module, scaffold/create/author/publish a
  module, set up the module MCP server, wire modules into damat.config.ts, or set
  up cross-module links (src/links, defineLink). Triggers on phrases like "add a
  damat module", "install the auth module", "create a damat module", "make this a
  shareable module", "link two modules / add a cross-module link", or "set up
  damat module install for AI".
---

# Damat modules

This skill makes you effective at the two halves of the Damat module system:
**installing existing modules** and **authoring new ones**. A Damat module is a
self-contained vertical slice — models + migrations + service + config +
workflows — that any Damat app can install with one command.

This skill assumes you're in **your own** Damat project — a module package or an
app — with the `@damatjs/*` packages installed (not the Damat monorepo source).
For detail, read each package's README (in `node_modules/@damatjs/<pkg>/README.md`
or on npm):
- `@damatjs/module` — the `module.json` contract, the authoring surface, and the
  standalone dev/test harness.
- `@damatjs/damat-cli` — the `damat module` commands (`damat module --help`).
- `@damatjs/mcp` — the module-install MCP server.
- `@damatjs/link` — cross-module links.

## Before you start

- Damat projects are **Bun** projects. Use `bun` / `bunx`, never npm/yarn/pnpm.
- The user-facing CLI is `damat` (from `@damatjs/damat-cli`); migrations are
  `damat-orm`. If a bin isn't on PATH, run it with `bunx damat …` / `bunx damat-orm …`.
- Confirm you're in (or targeting) a Damat **app** — it has a `damat.config.ts`
  and a `src/modules/` directory.

---

## A. Install an existing module

Prefer this order. If the `@damatjs/mcp` MCP server is connected (tools
`list_modules`, `search_modules`, `module_info`, `add_module`,
`list_installed`), use those tools — they wrap the audited CLI path.

1. **Discover.** `search_modules { query }` (or `list_modules`) to find
   candidates. No registry configured? Tell the user to set
   `DAMAT_MODULE_REGISTRY`, or proceed with a path/git source they provide.
2. **Inspect.** `module_info { ref }` — check description, version, required env
   vars, owner, and **verification status**. Surface this to the user.
3. **Check trust.** Never install a `rejected` or `revoked` module. If status is
   `unverified`/`pending` and policy is `require`, explain the
   `DAMAT_MODULE_VERIFY` options rather than silently overriding.
4. **Install.** `add_module { source }` (or, via CLI,
   `damat module add <source> [--name <id>] [--dir <path>] [--force]`).
   `source` can be a registry ref (`damatjs/user@0.2.0`), a local path
   (`./path`), a github shorthand (`owner/repo[/sub/dir]`), or a git URL.
   This copies the module into `src/modules/<id>`, registers it in
   `damat.config.ts`, syncs env vars into `.env.example`, and installs npm deps.
5. **Finish.** Tell the user (or do it, with confirmation):
   - set any newly required env vars in `.env`,
   - run `bun damat-orm migrate:up` to apply the module's migrations,
   - restart the dev server.
6. **Verify.** `list_installed` (or `damat module list`) to confirm it's
   registered.

Do **not** hand-edit `damat.config.ts`, copy files manually, or `bun add`
packages yourself when `add_module`/`damat module add` can do it — that path
keeps provenance and env/migration wiring correct.

---

## B. Author a new module

1. **Scaffold:** `damat module init <name>` creates a standalone module package.
2. **Implement** inside the package, importing the authoring surface from
   `@damatjs/module`:
   ```ts
   import { defineModule, ModuleService, model, columns } from "@damatjs/module";
   ```
   - `models/` — model definitions (the `@damatjs/orm-model` DSL).
     Reference relation targets by **table name** (a string), not a model import:
     `columns.belongsTo("users")`, `columns.hasMany("accounts")`. This avoids
     circular imports and lets a relation point at a table in another module.
   - `service.ts` — `export class XService extends ModuleService({ models, credentialsSchema })`.
   - `config/` — a zod `schema` and a `load(env)` credentials loader.
   - `index.ts` — `export default defineModule(NAME, { service, credentials: load })`.
3. **Migrations:** `damat module migration:create` (diffs models → SQL).
4. **Codegen:** `damat module codegen` (row types + zod schemas).
5. **Test in isolation** with the harness (no server needed):
   ```ts
   import { withModule } from "@damatjs/module";
   await withModule(mod, { moduleDir: import.meta.dir }, async ({ service }) => { /* ... */ });
   ```
6. **Make it portable:** add a `module.json` (its contract is documented in the
   `@damatjs/module` README) declaring `name`, `version`, `env`, `packages`,
   `modules`, and `registry` metadata.
7. **Validate:** `damat module validate` until there are **no warnings** — then
   it's registry-ready.

> **Relating to other modules?** A module never imports another module or
> foreign-keys into it. Cross-module relationships are **links**, declared in the
> *app's* `src/links/` (not inside the module). The authoring surface re-exports
> the helpers, so module code can use `import { defineLink, collectLinkModels,
> defineLinkModule } from "@damatjs/module"`. The runtime service is
> `getModule("link")` (`create`/`dismiss`/`fetch`/`graph`). See the
> `@damatjs/link` README.

---

## C. Cross-module links (`@damatjs/link`)

Links connect two **independent** modules — neither imports the other — e.g.
`user` ↔ `organization`, and generate a junction table. They live at the **app**
level under `src/links/` (not inside a module). Use a link instead of a direct
`belongsTo` when both sides are separately shippable modules.

The links tree mirrors modules — one directory per **owning** module:

```
src/links/
  index.ts                 # aggregates every owner → the single `link` module
  <owner>/                 # e.g. user/
    models/<a>-<b>.ts      # defineLink(...)
    index.ts               # export links + models = collectLinkModels(links)
    migrations/            # junction-table migrations (per owner)
```

1. **Define** the link (import link helpers from `@damatjs/framework`):
   ```ts
   // src/links/user/models/user-organization.ts
   import { defineLink } from "@damatjs/framework";
   export default defineLink(
     { module: "user", model: "user", field: "users" },
     { module: "organization", model: "organization", field: "organizations" },
   );
   ```
   Each endpoint is `{ module, model, field?, isList?, primaryKey? }`. `module` is
   the module id; `model` is its key in that module's `models` map (**not** a
   table name); `field` is how the far side is exposed in `graph` (defaults to
   `model`); `isList` defaults to `true` (many-to-many).
2. **Owner index** (`src/links/user/index.ts`) — `models` is what `damat-orm`
   discovers for migrations:
   ```ts
   import { collectLinkModels } from "@damatjs/framework";
   import userOrganization from "./models/user-organization";
   export const links = [userOrganization];
   export const models = collectLinkModels(links);
   ```
3. **Aggregate** (`src/links/index.ts`) — the default export is registered as the
   `link` runtime module:
   ```ts
   import { defineLinkModule } from "@damatjs/framework";
   import { links as userLinks } from "./user";
   export const links = [...userLinks];
   export default defineLinkModule(links);
   ```
4. **Wire config** — add `links: "./src/links"` (string or string[]) to
   `damat.config.ts`.
5. **Migrate + codegen** — each `<owner>` is its own `link:<owner>` migration
   module:
   ```bash
   bun damat-orm migrate:create link:user    # junction-table SQL
   bun damat-orm migrate:up
   bun damat-orm generate:types user         # weaves linked fields into the
   bun damat-orm generate:types organization #   *linked modules'* types
   ```
   Links emit **no** junction row types. Instead each linked module's entity gains
   the other side via a sibling `<table>.links.ts` (e.g. `Users` gets
   `organizations?: Organizations[]`). Run `generate:types` for the linked
   modules, not the link module, to refresh these.
6. **Use at runtime** through `getModule("link")`:
   ```ts
   const link = getModule("link");
   await link.create(
     { module: "user", model: "user", id },
     { module: "organization", model: "organization", id: orgId },
   );
   const orgs = await link.fetch(
     { module: "user", model: "user", id },
     { module: "organization", model: "organization" },
   );
   const { data } = await link.graph({
     module: "user", entity: "user",
     fields: ["*", "organizations.*"], filters: { id },
   });
   ```

Full reference: the `@damatjs/link` README.

---

## D. Set up module install for AI (MCP)

If the user wants AI-driven installs:
1. Add it to the app: `bun add -D @damatjs/mcp`.
2. Add/extend `.mcp.json` with a `damat-modules` server (see the `@damatjs/mcp`
   README). Set `DAMAT_MODULE_REGISTRY`, `DAMAT_APP_DIR`, and `DAMAT_CLI` in its
   `env`.
3. Validate the server speaks the protocol (run the installed `damat-mcp` bin):
   ```bash
   printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{}}}' \
     '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
   | bunx damat-mcp
   ```

---

## Guardrails

- Confirm before destructive flags (`--force` overwrites a module).
- Don't bypass the verification gate for `rejected`/`revoked` modules.
- After any install/author step that changes the schema, the database is **not**
  up to date until `damat-orm migrate:up` runs — always remind the user.
- Keep `damat.config.ts`'s `modules` as a keyed object `{ id: { resolve, id } }`.
- Cross-module links go in `damat.config.ts`'s top-level `links` field (a path or
  paths), **not** in `modules`. Their junction migrations live per-owner under
  `src/links/<owner>/migrations/`, applied by the same `migrate:up`.
