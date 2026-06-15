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

1. copy the module source into the app's `src/modules/<id>`,
2. register it in `damat.config.ts`,
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
  "modules": ["organization"],    // other damat modules this one depends on (registry ids)

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
| `modules` | `string[]` | — | Other module ids this module needs (a warning if missing). |
| `paths` | object | — | Overrides for `entry`/`models`/`migrations`/`workflows`/`types`. |
| `registry` | object | — | `namespace`, `keywords`, `license`, `repository`, `homepage`. |

**Standard layout** (used when `paths` is omitted): `entry ./index.ts`,
`models ./models`, `migrations ./migrations`, `workflows ./workflows`,
`types ./types`.

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
damat module add ./packages/modules/user

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
