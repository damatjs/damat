# @damatjs/damat-cli

> `damat` — the user-facing CLI for developing, building, and composing Damat backends and modules.

`@damatjs/damat-cli` provides the `damat` binary: the day-to-day entry point for
a Damat project. It runs the dev server with hot reload, produces a production
build, starts the built app, and hosts the `module` command group — a
shadcn-style toolchain for authoring standalone module packages and installing
them into an app (copy source, register in `damat.config.ts`, sync env vars,
install npm packages). It is built on the shared `@damatjs/cli` runner and the
`@damatjs/module` runtime/registry library.

Part of the [Damat](../../../README.md) monorepo · [Full guide](../../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

The binary is `damat`.

```bash
# inside the monorepo (workspace protocol)
bun add -d @damatjs/damat-cli@*

# in a generated project it is already a devDependency; invoke via bun
bun damat <command> [options]
```

```bash
# typical invocations from a project root
bun damat dev                 # dev server, hot reload
bun damat build               # production build
bun damat start               # run the build
bun damat module add user     # install a module
```

## Commands

| Command | Description | Example |
|---|---|---|
| `dev` (`d`) | Start the dev server with hot reload | `damat dev --port 4000 --clear` |
| `build` (`b`) | Build for production into `.damat/dist` | `damat build --minify --target node` |
| `start` (`s`) | Run the production build | `damat start --output .damat/dist` |
| `codegen <module>` \| `--all` | Types + zod + registry + scaffold-once CRUD for app modules | `damat codegen user` |
| `barrel [dir]` | Recursively (re)write `index.ts` barrels so one bare import re-exports a whole tree (default `src/workflows`) | `damat barrel` |
| `module` (`m`) | Module command group (see below); lists subcommands when run alone | `damat module` |
| `module add <source>` | Install a module from registry ref, path, or git | `damat module add damatjs/user@0.0.1` |
| `module list` (`ls`) | List modules installed in the app | `damat module list` |
| `module link-setup` | Materialize completed link drafts into `src/links/<owner>/` code | `damat module link-setup` |
| `module init <name>` | Scaffold a new standalone module package | `damat module init user-management` |
| `module dev` | Run the current module package standalone, hot reload | `damat module dev --port 7654` |
| `module migration:create` | Diff the module's models vs snapshot → migration | `damat module migration:create` |
| `module codegen` | Generate row types + zod schemas for the module | `damat module codegen` |
| `module validate` | Contract + registry-readiness check for the module | `damat module validate` |

## When to use

- **Inside a Damat backend**: use `damat dev` / `build` / `start` for the app
  lifecycle, and `damat module add` / `list` to compose third-party or in-house
  modules into `src/modules`.
- **Authoring a reusable module**: use `damat module init` to scaffold a
  standalone package, then `module dev` / `migration:create` / `codegen` /
  `validate` while developing it.
- For raw migration/codegen against a project's `damat.config.ts` (CI, scripts),
  the lower-level `damat-orm` CLI (`@damatjs/orm-cli`) is the direct tool; `damat
  module add` even suggests `bun damat-orm migrate:up` as the next step.

## Quick start

### Run an app

```bash
bun damat dev --port 3000     # writes .damat/dev-entry.ts and runs bun --watch
bun damat build               # bundles .damat/dist/entry.js, copies src/, builds config
bun damat start               # runs .damat/dist/entry.js (errors if not built)
```

`dev` and `start` load env via `@damatjs/load-env` (`NODE_ENV` or
`development`/`production`). `build` honours `--output`, `--target` (bun|node),
and `--minify`.

### Compose a module into your app

```bash
# from a registry ref (needs DAMAT_MODULE_REGISTRY), a local path, or git
bun damat module add user-management
bun damat module add ./packages/my-module
bun damat module add https://github.com/damatjs/modules.git#main

# then:
bun damat-orm migrate:up      # apply the module's migrations
# restart the dev server — the module self-registers via damat.config.ts
```

`module add` reads the module's `module.json` and **splits the module across the
app's layers**, grouping each tree by module id: models/service/config/types/
migrations → `src/modules/<id>` (overridable with `--dir`/`--name`/`--force`),
`api/routes/<table>` → `src/api/routes/<id>/<table>`, `workflows/<table>` →
`src/workflows/<id>/<table>`, and `tests/` → `tests/<id>`. It then registers the
module in `damat.config.ts` with provenance, adds the `@<id>/*` + `@workflows` /
`@workflows/*` tsconfig aliases, regenerates the workflow barrels, appends required
env vars to `.env.example` (warning about any missing in `.env`), and `bun add`s the
npm packages it needs. Registry installs pass through a verification gate before any
files are written.

### Author a standalone module

```bash
bun damat module init user-management   # scaffolds a runnable package
cd user-management && bun install
# add models in src/models, logic in src/service.ts
bun run migration:create                # = damat module migration:create
bun run codegen                         # = damat module codegen
bun run dev                             # = damat module dev
bun test                                # contract + service + api tests
```

## How it fits

**Depends on**:

- `@damatjs/cli` — command runner, option parsing, banner, help.
- `@damatjs/module` — manifest read/validate, module locate, registry parse /
  resolve / verify, `createModuleMigration`, `generateModuleTypes`,
  `runModuleEntry`, constants.
- `@damatjs/framework` — `runEntry` (app entry) and the `ModuleSource`
  provenance type.
- `@damatjs/load-env` — `.env` loading for `dev`/`start`/`module dev`.
- `@damatjs/logger` — logging types.
- Bun (`spawn`), Node `fs`/`path`/`child_process` for process + filesystem work.

**Consumed by**: developers via the `damat` binary; the scaffold templates wire a
new module package's scripts to `damat module …`. Shells out to `bun damat-orm`
and `bun add` as part of `module add`.

## Documentation

- [Internals](./docs/README.md) — module map, command dispatch, and the full
  `module` group + helpers + scaffold templates.
- [Full guide](../../../docs/GUIDE.md) — the Damat monorepo guide.

## License

MIT
