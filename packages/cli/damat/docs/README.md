# @damatjs/damat-cli — Internals

Maintainer-facing reference for the `damat` CLI. Read alongside the
[package README](../README.md), which covers user-facing usage.

## Split docs

- [commands.md](./commands.md) — the app-lifecycle commands: `dev`, `build`,
  `start`.
- [module-commands.md](./module-commands.md) — the full `module` group
  (`add`, `list`, `init`, `dev`, `migration:create`, `codegen`, `validate`) and
  the `add` helpers (source resolution, copy, config registration, env sync,
  package install).
- [scaffolding.md](./scaffolding.md) — the `module init` file templates.

## Module map

| File / dir | Responsibility |
|---|---|
| `src/cli.ts` | Executable entry (`#!/usr/bin/env bun`). `runCli({ commands: [devCommand, startCommand, buildCommand, moduleCommand], banner })` |
| `src/index.ts` | Library entry — `export * from "@damatjs/cli"` (re-exposes command types + `runCli`) |
| `src/command/index.ts` | Barrel re-exporting `build`, `dev`, `start`, `module` |
| `src/command/dev.ts` | `devCommand` — hot-reload dev server |
| `src/command/build.ts` | `buildCommand` — production bundle + source/config copy |
| `src/command/start.ts` | `startCommand` — run the built app |
| `src/command/module/index.ts` | `moduleCommand` — parent of the module subcommands |
| `src/command/module/add.ts` | `moduleAddCommand` — install a module (the big one) |
| `src/command/module/list.ts` | `moduleListCommand` — list installed modules + provenance |
| `src/command/module/init.ts` | `moduleInitCommand` — scaffold a standalone module package |
| `src/command/module/dev.ts` | `moduleDevCommand` — run a module package standalone |
| `src/command/module/migrationCreate.ts` | `moduleMigrationCreateCommand` — diff models → migration |
| `src/command/module/codegen.ts` | `moduleCodegenCommand` — row types + zod schemas |
| `src/command/module/validate.ts` | `moduleValidateCommand` — contract/registry check |
| `src/command/module/helpers/*` | `add`'s helpers: `source`, `copy`, `config`, `env`, `packages`, `dependencies`, `types` |
| `src/command/module/scaffold/templates.ts` | File templates emitted by `module init` |

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
  └─ runCli({ commands: [dev, start, build, module], banner })
        │
        ├─ devCommand    → writes .damat/dev-entry.ts → bun --watch
        ├─ buildCommand  → bun build → copy src/ + build damat.config.ts
        ├─ startCommand  → bun run .damat/dist/entry.js
        └─ moduleCommand (parent; subcommands:)
              ├─ add               → helpers/* + @damatjs/module (resolve/verify/manifest)
              ├─ list / ls         → scan src/modules, read module.json + config provenance
              ├─ init              → scaffold/templates.ts
              ├─ dev               → writes .damat/module-dev-entry.ts → bun --watch
              ├─ migration:create  → @damatjs/module createModuleMigration
              ├─ codegen           → @damatjs/module generateModuleTypes
              └─ validate          → @damatjs/module locateModuleDir + validateModuleDir
```

Every handler returns `{ exitCode }` and reports through `ctx.logger`.

## Command-dispatch / data flow

- `cli.ts` passes the top-level command array to `runCli`; the runner resolves
  `damat <cmd> <subcmd> …`. `module` is a parent command — its handler prints a
  cheat-sheet; the dispatchable commands are its subcommands.
- App-lifecycle commands operate on the **current project** (`ctx.cwd`): they
  write a tiny entry file under `.damat/` and `spawn` Bun against it.
- Module-authoring commands (`init`, `dev`, `migration:create`, `codegen`,
  `validate`) operate on the **current module package** (`ctx.cwd`), via
  `@damatjs/module`.
- `module add` is the one cross-cutting command: it pulls a module from a remote
  or local source into the current app and mutates `damat.config.ts`,
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
