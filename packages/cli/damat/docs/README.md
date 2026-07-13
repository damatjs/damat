# @damatjs/damat-cli — Internals

Maintainer-facing reference for the `damat` CLI. Read alongside the
[package README](../README.md), which covers user-facing usage.

## Split docs

- [commands.md](./commands.md) — the app-lifecycle commands: `create`,
  `clone`, `dev`, `build`, `start`.
- [module-commands.md](./module-commands.md) — the full `module` group
  (`add`, `remove`, `update`, `list`, `init`, `dev`, `migration:create`,
  `migration:run`, `migration:status`, `codegen`, `validate`, `build`,
  `publish`) and the `add` helpers (source resolution, copy, config
  registration, tsconfig aliases, env sync, package install).
- [kit-commands.md](./kit-commands.md) — the `kit` group: sharing code between
  ANY projects via `damat-kit.json` (`add`, `init`, `validate`).
- [scaffolding.md](./scaffolding.md) — the `module init` file templates.

## Module map

| File / dir | Responsibility |
|---|---|
| `src/cli.ts` | Executable entry (`#!/usr/bin/env bun`). `runCli({ commands: [create, clone, dev, start, build, codegen, barrel, module, kit], banner })` |
| `src/index.ts` | Library entry — `export * from "@damatjs/cli"` (re-exposes command types + `runCli`) |
| `src/command/index.ts` | Barrel re-exporting `build`, `clone`, `create`, `dev`, `kit`, `start`, `codegen`, `barrel`, `module` |
| `src/command/create/` | `createCommand` — scaffold a new app offline (`create/scaffold/` holds the embedded templates); option is `--pin`, **not** `--version` (cac owns `-v, --version`) |
| `src/command/clone/` | `cloneCommand` — git clone with extras (shorthand, `#ref`, subdirectory extraction, `--fresh`) |
| `src/command/dev.ts` | `devCommand` — hot-reload dev server |
| `src/command/build.ts` | `buildCommand` — production bundle + source/config copy |
| `src/command/start.ts` | `startCommand` — run the built app |
| `src/command/codegen/` | `codegenCommand` — app-mode codegen (types + zod + registry + CRUD scaffold) via `@damatjs/codegen` |
| `src/command/barrel/` | `barrelCommand` — recursively (re)write `index.ts` barrels |
| `src/command/kit/` | `kitCommand` group — `add`/`init`/`validate` + `manifest`/`plan`/`source` internals |
| `src/command/shared/git.ts` | `gitAvailable`/`requireGit` — system-git detection; one clear error instead of a vague spawn failure |
| `src/command/shared/typecheck.ts` | `runTypeCheck` — shared by `module build` / `module publish` |
| `src/command/module/index.ts` | `moduleCommand` — parent of the module subcommands |
| `src/command/module/add.ts` | `moduleAddCommand` — install a module (the big one) |
| `src/command/module/remove.ts` | `moduleRemoveCommand` — inverse of add (files, config, aliases) |
| `src/command/module/update.ts` | `moduleUpdateCommand` — re-fetch from recorded provenance, diff, reinstall |
| `src/command/module/list.ts` | `moduleListCommand` — list installed modules + provenance |
| `src/command/module/init.ts` | `moduleInitCommand` — scaffold a standalone module package |
| `src/command/module/dev.ts` | `moduleDevCommand` — run a module package standalone |
| `src/command/module/migrationCreate.ts` | `moduleMigrationCreateCommand` — diff models → migration |
| `src/command/module/migrationRun.ts` | `moduleMigrationRunCommand` — apply the module's migrations to `DATABASE_URL` |
| `src/command/module/migrationStatus.ts` | `moduleMigrationStatusCommand` — applied vs pending migrations |
| `src/command/module/codegen.ts` | `moduleCodegenCommand` — row types + zod schemas |
| `src/command/module/validate.ts` | `moduleValidateCommand` — contract/registry check |
| `src/command/module/build.ts` | `moduleBuildCommand` — type-check + contract validate (release gate, no bundle) |
| `src/command/module/publish.ts` | `modulePublishCommand` — validate, build, pack, PUT to the registry gateway |
| `src/command/module/helpers/*` | `add`/`remove`/`update` helpers: `source`, `copy`, `config`, `tsconfig`, `env`, `packages`, `dependencies`, `guard`, `linkTemplates`, `types` |
| `src/command/module/scaffold/` | File templates emitted by `module init` (`templates/` one file per template; `AGENTS.md` is embedded as `agents.generated.ts` via `scripts/embedAgents.ts`) |

## Architecture overview

`damat` is a thin command layer on top of two libraries:

- **`@damatjs/cli`** — owns argv parsing, subcommand resolution, option
  coercion/validation, banner and help. `cli.ts` just hands it the command list.
- **`@damatjs/module`** — the module runtime + registry library. The CLI is
  mostly orchestration; the real module logic (manifest reading/validation,
  registry resolution, verification policy, migration/codegen for a module
  package, the module dev entry) lives there.

```
cli.ts
  └─ runCli({ commands: [create, clone, dev, start, build, codegen, barrel, module, kit], banner })
        │
        ├─ createCommand → embedded templates → new app dir (+ git init, bun install)
        ├─ cloneCommand  → system git (requireGit) → clone/extract, --fresh, --name, --install
        ├─ devCommand    → writes .damat/dev-entry.ts → bun --watch
        ├─ buildCommand  → bun build → copy src/ + build damat.config.ts
        ├─ startCommand  → bun run .damat/dist/entry.js
        ├─ codegenCommand→ @damatjs/codegen (types + zod + registry + CRUD scaffold)
        ├─ barrelCommand → rewrite index.ts barrels (default src/workflows)
        ├─ kitCommand (parent; subcommands: add / init / validate)
        └─ moduleCommand (parent; subcommands:)
              ├─ add               → helpers/* + @damatjs/module (resolve/verify/manifest)
              ├─ remove / rm       → moduleLayoutPaths + deregister config + drop aliases
              ├─ update / up       → re-resolve recorded source, diff, reinstall (--yes)
              ├─ list / ls         → scan src/modules, read module.json + config provenance
              ├─ init              → scaffold/templates/*
              ├─ dev               → writes .damat/module-dev-entry.ts → bun --watch
              ├─ migration:create  → @damatjs/module createModuleMigration
              ├─ migration:run     → @damatjs/module runModuleMigration
              ├─ migration:status  → @damatjs/module runModuleMigrationStatus
              ├─ codegen           → @damatjs/module generateModuleTypes
              ├─ validate          → @damatjs/module locateModuleDir + validateModuleDir
              ├─ build             → shared/typecheck + validateModuleDir (release gate)
              └─ publish           → typecheck + validate + tar pack + PUT <gateway>/api/npm/<name>
```

Every handler returns `{ exitCode }` and reports through `ctx.logger`.

## Command-dispatch / data flow

- `cli.ts` passes the top-level command array to `runCli`; the runner resolves
  `damat <cmd> <subcmd> …`. `module` and `kit` are parent commands — their
  handlers print a cheat-sheet; the dispatchable commands are their subcommands.
- Project-creating commands (`create`, `clone`) write a **new directory** under
  `ctx.cwd`; both refuse an existing target. `clone` (and `kit add`'s git
  sources) require the **system git** — `shared/git.ts`'s `requireGit` turns a
  missing binary into one clear up-front error (the CLI never bundles its own
  git).
- App-lifecycle commands (`dev`, `build`, `start`) operate on the **current
  project** (`ctx.cwd`): they write a tiny entry file under `.damat/` and
  `spawn` Bun against it. `codegen` and `barrel` also operate on the current
  project, but generate source instead of spawning it.
- Module-authoring commands (`init`, `dev`, `migration:create`,
  `migration:run`, `migration:status`, `codegen`, `validate`, `build`,
  `publish`) operate on the **current module package** (`ctx.cwd`), via
  `@damatjs/module`.
- `module add` / `remove` / `update` are the cross-cutting commands: they pull
  a module from a remote or local source into the current app (or invert /
  redo that) and mutate `damat.config.ts`, `tsconfig.json` aliases,
  `.env.example`, and the app's installed packages.

## Invariants / design decisions

- **`.damat/` is the scratch dir.** `dev`, `build`, and `module dev` write a
  generated entry file there (`dev-entry.ts`, `build-entry.ts`,
  `module-dev-entry.ts`) and best-effort `unlinkSync` it afterward. `build`
  cleans and recreates the output dir.
- **Bun is the runtime.** Commands `spawn`/`spawnSync` `bun` (build, run, watch)
  and `bun add` (package install). There is no Node fallback path.
- **`module add` is conservative about config edits.** `registerModuleInConfig`
  only writes when it can unambiguously find the `modules: { … }` block (or the
  `defineConfig({…})` close); otherwise it returns `false` and the command
  prints manual instructions rather than corrupting the file.
- **Provenance is recorded.** Every installed module gets a `source: { … }`
  block in `damat.config.ts` (type/ref/url/version/owner/verification/integrity/
  installedAt). `module list` reads it back, best-effort, via regex.
- **Verification gate.** Registry installs run `evaluateVerification` before any
  files are copied; `rejected`/`revoked` are always blocked, and policy
  (`DAMAT_MODULE_VERIFY` / `DAMAT_MODULE_REQUIRE_VERIFIED`) governs
  unverified/pending. Path and git sources carry no verification and are
  refused unless `--allow-unverified` is passed (or the policy is `off`), and
  must pass `validateModuleDir`. Module id / `--dir` are validated against
  path traversal, dependency specs against the npm name/semver grammar, and
  `bun add` runs with `--ignore-scripts` unless `--allow-scripts` is passed.
- **Soft dependencies.** Unmet module-to-module dependencies (`manifest.modules`)
  are warnings, not blockers.

## Safe-extension guidance

- **Add an app command**: create `src/command/<name>.ts` exporting a `Command`,
  re-export it from `src/command/index.ts`, and add it to the array in
  `src/cli.ts`.
- **Add a module subcommand**: create `src/command/module/<name>.ts`, then add it
  to `moduleCommand.subcommands` and the re-export list in
  `src/command/module/index.ts`. Keep heavy work in `@damatjs/module`; the CLI
  command should stay orchestration-only.
- **Keep `.damat/` writes best-effort-cleaned** and always return an explicit
  `exitCode`. For anything that mutates the user's project, prefer the
  conservative pattern in `registerModuleInConfig` (detect, else instruct).
