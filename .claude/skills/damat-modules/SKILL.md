---
name: damat-modules
description: >-
  Work with the Damat module system — install existing modules into a Damat app
  and author new ones. Use when the user wants to add/install/find a Damat
  module, scaffold/create/author/publish a module, set up the module MCP server,
  or wire modules into damat.config.ts. Triggers on phrases like "add a damat
  module", "install the auth module", "create a damat module", "make this a
  shareable module", or "set up damat module install for AI".
---

# Damat modules

This skill makes you effective at the two halves of the Damat module system:
**installing existing modules** and **authoring new ones**. A Damat module is a
self-contained vertical slice — models + migrations + service + config +
workflows — that any Damat app can install with one command.

Authoritative references in the repo (read them when you need detail):
- `MODULES.md` — the `module.json` contract + registry/trust model.
- `docs/GUIDE.md` §16–18 — authoring, installing, and the MCP flow.
- `packages/module/docs/` — module-system internals.
- `packages/cli/damat/docs/module-commands.md` — the `damat module` commands.
- `packages/mcp/README.md` — the MCP server.

## Before you start

- This is a **Bun** repo. Use `bun` / `bunx`, never npm/yarn/pnpm.
- The user-facing CLI is `damat`; migrations are `damat-orm`. If a bin isn't on
  PATH in this environment, run the source: `bun packages/cli/damat/src/cli.ts …`.
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
   - `models/` — model definitions (the [orm-model DSL](../../../packages/orm/model/README.md)).
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
6. **Make it portable:** add a `module.json` (see `MODULES.md`) declaring
   `name`, `version`, `env`, `packages`, `modules`, and `registry` metadata.
7. **Validate:** `damat module validate` until there are **no warnings** — then
   it's registry-ready.

> **Relating to other modules?** A module never imports another module or
> foreign-keys into it. Cross-module relationships are **links**, declared in the
> *app's* `src/links/` (not inside the module). The authoring surface re-exports
> the helpers, so module code can use `import { defineLink, collectLinkModels,
> defineLinkModule } from "@damatjs/module"`. The runtime service is
> `getModule("link")` (`create`/`dismiss`/`fetch`/`graph`). See
> `packages/link/README.md`.

---

## C. Set up module install for AI (MCP)

If the user wants AI-driven installs:
1. Ensure `@damatjs/mcp` is available (in this repo it's `packages/mcp`; in an
   app, `bun add -D @damatjs/mcp`).
2. Add/extend `.mcp.json` with a `damat-modules` server (see
   `packages/mcp/README.md`). Set `DAMAT_MODULE_REGISTRY`, `DAMAT_APP_DIR`, and
   `DAMAT_CLI` in its `env`.
3. Validate the server speaks the protocol:
   ```bash
   printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{}}}' \
     '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
   | DAMAT_MODULE_REGISTRY=packages/mcp/registry.example.json bun run packages/mcp/bin/damat-mcp.ts
   ```

---

## Guardrails

- Confirm before destructive flags (`--force` overwrites a module).
- Don't bypass the verification gate for `rejected`/`revoked` modules.
- After any install/author step that changes the schema, the database is **not**
  up to date until `damat-orm migrate:up` runs — always remind the user.
- Keep `damat.config.ts`'s `modules` as a keyed object `{ id: { resolve, id } }`.
