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
# typical invocations
bunx damat create my-api      # scaffold a new backend app (offline)
bun damat dev                 # dev server, hot reload
bun damat build               # production build
bun damat start               # run the build
bun damat module add user     # install a module
```

## Commands

| Command                       | Description                                                                                                                                                                                       | Example                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `create <name>` (`new`)       | Scaffold a new backend app from embedded templates — offline, no starter repo; writes `.env` with generated secrets, git-inits, runs `bun install` (`--no-git` / `--no-install` to skip)          | `damat create my-api`                               |
| `clone <source> [dir]`        | git clone with extras: github shorthand + `#ref`, subdirectory extraction, `--fresh` new history, `--name` package rename, `--install`                                                            | `damat clone acme/mono/examples/api my-api --fresh` |
| `kit` (`k`)                   | Kit command group (see below); lists subcommands when run alone                                                                                                                                   | `damat kit`                                         |
| `kit add <source>`            | Copy a shared kit (any codebase with a `damat-kit.json`) into THIS project — shadcn-style editable source for every kind of project; `--dry-run` / `--force` / `--no-install`                     | `damat kit add acme/design-kit --dry-run`           |
| `kit init [name]`             | Describe the current codebase as a shareable kit (writes `damat-kit.json`)                                                                                                                        | `damat kit init design-system`                      |
| `kit validate`                | Check the manifest + preview where every file would land in a consumer                                                                                                                            | `damat kit validate`                                |
| `auth`                        | Auth setup command group (see below); prints provider install/config help when run alone                                                                                                          | `damat auth`                                        |
| `auth init <provider>`        | Scaffold the storage module a provider needs (Better Auth); a no-op note for hosted providers (Clerk/Auth0)                                                                                       | `damat auth init better-auth`                       |
| `dev` (`d`)                   | Start the dev server with hot reload                                                                                                                                                              | `damat dev --port 4000 --clear`                     |
| `build` (`b`)                 | Build for production into `.damat/dist`                                                                                                                                                           | `damat build --minify --target node`                |
| `start` (`s`)                 | Run the production build                                                                                                                                                                          | `damat start --output .damat/dist`                  |
| `codegen <module>` \| `--all` | Types + zod + registry + scaffold-once CRUD for app modules                                                                                                                                       | `damat codegen user`                                |
| `barrel [dir]`                | Recursively (re)write `index.ts` barrels so one bare import re-exports a whole tree (default `src/workflows`)                                                                                     | `damat barrel`                                      |
| `module` (`m`)                | Module command group (see below); lists subcommands when run alone                                                                                                                                | `damat module`                                      |
| `module add <source>`         | Install a module from registry ref, path, or git (splits any shipped link files into `src/links/<moduleId>/`); path/git sources need `--allow-unverified`; `--dry-run` prints the plan            | `damat module add damatjs/user@0.0.1`               |
| `module remove <id>` (`rm`)   | Remove an installed module — inverse of add (deletes files, deregisters config, drops the tsconfig alias); refuses while other modules depend on it unless `--force`; `--dry-run` / `--clean-env` | `damat module remove user`                          |
| `module update <id>` (`up`)   | Re-fetch a module from its recorded source, show a version + file diff, and reinstall with `--yes` (overwrites local edits)                                                                       | `damat module update user --dry-run`                |
| `module list` (`ls`)          | List modules installed in the app                                                                                                                                                                 | `damat module list`                                 |
| `module init <name>`          | Scaffold a new standalone module package                                                                                                                                                          | `damat module init user-management`                 |
| `module dev`                  | Run the current module package standalone, hot reload                                                                                                                                             | `damat module dev --port 7654`                      |
| `module migration:create`     | Diff the module's models vs snapshot → migration                                                                                                                                                  | `damat module migration:create`                     |
| `module migration:run`        | Apply the module's own migrations to `DATABASE_URL`                                                                                                                                               | `damat module migration:run`                        |
| `module migration:status`     | Show the module's applied vs pending migrations                                                                                                                                                   | `damat module migration:status`                     |
| `module codegen`              | Generate row types + zod schemas for the module                                                                                                                                                   | `damat module codegen`                              |
| `module validate`             | Contract + registry-readiness check for the module                                                                                                                                                | `damat module validate`                             |
| `module build`                | Type-check + contract validate for release                                                                                                                                                        | `damat module build`                                |
| `module publish`              | Validate, build, pack, and publish the module to the registry gateway                                                                                                                             | `damat module publish --dry-run`                    |

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

### Scaffold an app

```bash
bunx damat create my-api      # embedded templates — works offline, no starter repo
cd my-api
bun run dev                   # http://localhost:6543/api/hello
```

The scaffold writes `damat.config.ts` (empty `modules` block ready for `module
add`), a working example route, a `.env` with generated `JWT_SECRET`/
`COOKIE_SECRET`, the `@workflows` tsconfig aliases, git-inits, and runs `bun
install`. `@damatjs/*` dependencies default to the CLI's own version; override
with `--pin`.

### Run an app

```bash
bun damat dev --port 3000     # writes .damat/dev-entry.ts and runs bun --watch
bun damat build               # bundles .damat/dist/entry.js, copies src/, builds config
bun damat start               # runs .damat/dist/entry.js (errors if not built)
```

`dev` and `start` load env via `@damatjs/load-env` (`NODE_ENV` or
`development`/`production`). `build` honours `--output`, `--target` (bun|node),
and `--minify`.

### Share code between ANY projects (kits)

Kits generalize `module add` to every kind of project: any codebase that
ships a `damat-kit.json` can be copied into any other project — like packages
into node_modules, but shadcn-style: the files land as editable source, where
the kit says they belong.

```jsonc
// damat-kit.json — in the SOURCE codebase
{
  "name": "design-sys",
  "mappings": [
    // first match wins
    { "from": "src/components/**", "to": "app/ui" },
    { "from": "src/hooks/**", "to": "app/lib/hooks" },
  ],
  "fallback": "shared/design-sys", // where unknown files go
  "ignore": ["**/*.test.*"],
  "packages": { "zod": "^4.0.0" }, // installed via bun add
  "notes": "Import the theme in your root layout.",
}
```

```bash
# in the source codebase
damat kit init design-sys        # write a starter manifest
damat kit validate               # preview where every file would land

# in ANY consuming project
damat kit add acme/design-sys --dry-run   # URL, user/repo[/subdir][#ref], or path
damat kit add acme/design-sys             # copy in + record in damat-kits.json
```

Placement: a file's path after the glob's static prefix nests under `to`
(`src/components/nav/menu.tsx` → `app/ui/nav/menu.tsx`); files matched by no
mapping go to `fallback` (or are skipped with a warning when none is
declared). Existing files are kept unless `--force`, installs are recorded in
`damat-kits.json`, package specs pass the same safety gate as `module add`,
and manifest target paths are validated (relative, no `..`).

### Compose a module into your app

```bash
# from a registry ref (needs DAMAT_MODULE_REGISTRY), a local path, or git.
# path/git sources carry no registry verification, so they require the
# explicit --allow-unverified opt-in (registry refs go through the
# verification gate instead)
bun damat module add user-management
bun damat module add ./packages/my-module --allow-unverified
bun damat module add https://github.com/damatjs/modules.git#main --allow-unverified

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
npm packages it needs. Every install is gated before any file is written: registry
installs pass through the verification gate, path/git installs require
`--allow-unverified` plus a passing `validateModuleDir` check, the module id and
`--dir` are rejected if they could traverse outside the app, and dependency specs
must be plain npm name + semver range (lifecycle scripts are skipped via
`--ignore-scripts` unless you pass `--allow-scripts`).

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
