# Damat modules — the `module.json` contract

A **module** is a self-contained vertical slice of a backend: its own models,
migrations, service, config, and workflows. What makes a module *portable* —
installable into any Damat app with `damat module add` and, in future,
discoverable through the module registry — is a small manifest file,
**`module.json`**, that ships next to the module's `index.ts`.

This is the authoritative reference for that contract. The types live in
[`@damatjs/module`](./packages/module/README.md) (`src/manifest/types.ts`); the
authoring/runtime details are in
[the module package internals](./packages/module/docs/README.md).

---

## Where it lives

A standalone module package looks like this:

```
my-module/
├── module.json            # the manifest (this document)
├── module.config.ts       # optional standalone-app overrides
├── package.json           # the module's own npm deps
└── src/
    ├── index.ts           # default-exports defineModule(...)
    ├── models/            # ORM model definitions
    ├── migrations/        # SQL migrations
    ├── workflows/         # workflow definitions
    └── types/             # generated row types + zod schemas
```

`damat module add <source>` reads `module.json` to:

1. **split the module across the app's layers**, grouping each tree by module id:
   models/service/config/types/migrations → `src/modules/<id>`,
   `api/routes/<table>` → `src/api/routes/<id>/<table>`,
   `workflows/<table>` → `src/workflows/<id>/<table>`, and `tests/` → `tests/<id>`,
2. register it in `damat.config.ts`, add its `@<id>/*` + `@workflows` tsconfig
   aliases, and regenerate the workflow barrels,
3. write required env vars to `.env.example` (and warn about missing ones),
4. install the npm packages the module needs.

---

## Fields

```jsonc
{
  // Required ----------------------------------------------------------------
  "name": "user",                 // module id: registry key + default dir name (kebab-case)

  // Identity ----------------------------------------------------------------
  "version": "0.2.0",             // semver
  "description": "Auth, sessions and accounts.",
  "author": "Abel <a@b.co> (https://…)",   // string OR { name, email?, url? }

  // Wiring ------------------------------------------------------------------
  "env": [                        // env vars the credentials loader reads
    {
      "name": "BETTER_AUTH_SECRET",
      "required": true,           // default true; fails to start without it
      "description": "Min 32-char secret for Better Auth",
      "example": "change-me-min-32-characters-long"   // written to .env.example
    }
  ],
  "packages": {                   // npm packages the host app must install
    "better-auth": "^1.4.18"      //   name -> semver range
  },
  "pairsWith": ["organization"],  // non-binding hint: modules this pairs well with
  // "modules": ["organization"], // rare: a HARD dependency — prefer pairsWith
  "link": [                       // cross-module link RULES (non-binding, like pairsWith)
    {
      "name": "user-organization",
      "from": { "module": "user", "model": "users", "field": "users" },  // this module's side
      "to":   { "module": "", "model": "", "field": "" }                 // backend owner fills the target
    }
  ],

  // Layout overrides (omit to use the standard layout) ----------------------
  "paths": {
    "entry": "./index.ts",
    "models": "./models",
    "migrations": "./migrations",
    "workflows": "./workflows",
    "types": "./types"
  },

  // Registry publishing metadata (optional today) ---------------------------
  "registry": {
    "namespace": "damatjs",       // publisher/org
    "keywords": ["auth", "users"],
    "license": "MIT",
    "repository": "https://github.com/damatjs/modules",
    "homepage": "https://github.com/damatjs/modules/tree/main/user"
  }
}
```

### Field summary

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | ✅ | Module id; registry key and default install directory. |
| `version` | string | — | Semver. Required to publish to the registry. |
| `description` | string | — | Shown on install and in the registry. |
| `author` | string \| object | — | `"Name <email> (url)"` or `{ name, email?, url? }`. Mirrored by the registry; **not** the verified owner. |
| `env` | `ModuleEnvVar[]` | — | Each: `{ name, required?, description?, example? }`. Drives `.env.example` sync. |
| `packages` | `Record<string,string>` | — | npm deps installed into the host app on `add`. |
| `pairsWith` | `string[]` | — | Non-binding hint: modules this one pairs well with. A comment for the backend owner — never enforced or installed. **Prefer this** to express relationships. |
| `link` | `ModuleLink[]` | — | Cross-module link **rules** (non-binding, like `pairsWith`). Each: `{ name?, from, to, pivotTable?, foreignKeys? }` where `from`/`to` are `{ module?, model?, field?, primaryKey?, isList? }`. `from` is this module's own side; `to` is left blank for the backend owner. On `add` each rule is seeded into `src/links/.link-drafts.json`; the owner fills the target and runs `damat module link-setup` to generate `src/links/<owner>/`. **A module never creates the connection itself.** |
| `modules` | `string[]` | — | **Rare.** A hard dependency on other modules (install only *warns* if missing). A module should stay self-contained — reach for `pairsWith` instead. |
| `paths` | object | — | Overrides for `entry`/`models`/`migrations`/`workflows`/`types`. |
| `registry` | object | — | `namespace`, `keywords`, `license`, `repository`, `homepage`. |

**Standard layout** (used when `paths` is omitted): `entry ./index.ts`,
`models ./models`, `migrations ./migrations`, `workflows ./workflows`,
`types ./types`.

> **Composition is the backend owner's job.** A module is a single-purpose unit;
> it should not decide what it is plugged into. Use `pairsWith` (or `description`)
> to *suggest* pairings, and leave cross-module links and wiring to the app.
> `modules` is an escape hatch for genuine hard dependencies only.
>
> A `link` rule goes one step further than `pairsWith`: it ships a concrete,
> reusable *shape* for a connection (this module's own endpoint plus a blank
> target). It still creates nothing on its own — `damat module add` only seeds an
> editable draft, and the backend owner fills the target and runs
> `damat module link-setup` to materialize the link under `src/links/<owner>/`.

---

## Validation & readiness

`@damatjs/module` ships a validator with two modes:

```ts
import { validateModuleDir } from "@damatjs/module";

const report = validateModuleDir("./src/modules/user");
// report.errors   → block installing (missing entry, broken manifest, …)
// report.warnings → block publishing  (missing version, license, namespace, …)
```

`damat module validate` runs the same check from the CLI. Author your module
*registry-ready* (no warnings) even before the hosted registry exists.

---

## Registry references & trust

Once published, modules are addressed by **ref**:

```
user                  name only        (default namespace, latest version)
user@0.2.0            pinned version
damatjs/user          namespaced
damatjs/user@latest   namespaced + tag
```

The registry index maps each ref to a fetchable **source** plus trust metadata
(verifiable **owner** + **verification** status) that the registry backend
stamps — an author cannot self-verify. At install time the **verification
gate** applies a policy from the environment:

| `DAMAT_MODULE_VERIFY` | Behavior |
|-----------------------|----------|
| `off` | install anything, say nothing |
| `warn` *(default)* | install anything, warn when not verified |
| `require` | only install `verified` modules |

A `rejected` or `revoked` module is **always** blocked, regardless of policy.
Configure the registry location with `DAMAT_MODULE_REGISTRY` (an index URL, a
`registry.json` path, or a directory containing one). The full registry schema
is documented in
[`@damatjs/module` → registry internals](./packages/module/docs/registry.md).

---

## Installing a module

```bash
# from a registry ref (needs DAMAT_MODULE_REGISTRY)
damat module add damatjs/user@0.2.0

# from a local path
damat module add ./modules/user

# from github shorthand or a git URL
damat module add damatjs/modules/user
damat module add https://github.com/damatjs/modules.git#main

# then apply the module's migrations and restart
bun damat-orm migrate:up
```

AI assistants can do all of this through the
[`@damatjs/mcp`](./packages/mcp/README.md) server — see
[the guide](./docs/GUIDE.md).

## Authoring a module

```bash
damat module init my-module     # scaffold a standalone module package
cd my-module
damat module dev                # run the module as a live app
damat module migration:create   # diff models -> migration
damat module codegen            # generate row types + zod schemas
damat module validate           # contract + registry readiness
```

See [the guide's authoring chapter](./docs/GUIDE.md) and
[`@damatjs/module`](./packages/module/README.md) for the full workflow.
