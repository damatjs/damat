# @damatjs/create-damat-app — Internals

Maintainer-facing reference for the `create-damat-app` scaffolder. Read alongside
the [package README](../README.md), which covers user-facing usage.

This package is **Bun-only** and runs on the shared `@damatjs/cli` runner: argv is
parsed through `@damatjs/cli` (`src/index.ts`) and the `PackageManager`
(`src/utils/package/manager.ts`) targets Bun exclusively.

> The `src/utils/__tests__/packageManager.test.ts` suite asserts a multi-manager
> (`useNpm`/`useYarn`/`usePnpm`) API that the current `PackageManager` class does
> not expose — treat that suite as stale, not as the contract.

## Split docs

- [flow.md](./flow.md) — end-to-end create flow, from argv to a running app.
- [project-vs-module.md](./project-vs-module.md) — the two creators and how they
  differ.
- [database-setup.md](./database-setup.md) — the (currently standalone) Postgres
  helpers.
- [package-managers.md](./package-managers.md) — the Bun-only `PackageManager`
  and command execution.

## Module map

| File / dir | Responsibility |
|---|---|
| `src/index.ts` | Executable entry. Defines the `create` command + options and calls `runCli(...)` |
| `src/commands/create.ts` | Command handler — delegates to `ProjectCreatorFactory.create(...).create()` |
| `src/types.d.ts` | Ambient `wait-on` module declaration |
| `src/utils/projectCreator/creator.ts` | `ProjectOptions`, `ProjectCreator`, abstract `BaseProjectCreator` |
| `src/utils/projectCreator/projectCreatorFactory.ts` | Bun-version gate, name resolution/prompt, picks project vs module creator |
| `src/utils/projectCreator/damatProjectCreator.ts` | Full project: clone → prepare → start dev |
| `src/utils/projectCreator/damatModuleCreator.ts` | Module: clone → prepare (no dev server) |
| `src/utils/projectCreator/index.ts` | Barrel for the above |
| `src/utils/actions/cloneRepo.ts` | `cloneRepo`/`runCloneRepo`, `.git`/`.github` strip, fresh `git init` |
| `src/utils/actions/prepareProject.ts` | Rewrite package.json, write `.env`, install deps (project vs module) |
| `src/utils/commands/executor.ts` | `execute(...)` — promisified `exec` or `spawnSync` (verbose) |
| `src/utils/commands/manager.ts` | `ProcessManager` — SIGTERM/SIGINT hooks, interval tracking, EAGAIN retry |
| `src/utils/commands/createAbortController.ts` | `AbortController` wired to terminate; `isAbortError`/`getAbortError` |
| `src/utils/commands/facts.ts` | The animated "damat Tips" fact box (spinner text) |
| `src/utils/commands/startDamat.ts` | `exec("bun run dev")` in the project dir, piping stdio |
| `src/utils/package/manager.ts` | `PackageManager` — Bun detection, `bun install`, command strings |
| `src/utils/package/versionsUpdater.ts` | `PackageVersionsUpdate` — pin `@damatjs/*` deps (skip `@damatjs/ui`) |
| `src/utils/database/*` | `postgresClient`, `formatConnectionString`, `create` (DB creation flow) |
| `src/utils/gets/bunVersion.ts` | `getBunVersion`, `MIN_SUPPORTED_BUN_VERSION` |
| `src/utils/gets/configStore.ts` | `getConfigStore` — global `configstore` (currently unused) |
| `src/utils/gets/CurrentOs.ts` | `getCurrentOs` — platform → macos/linux/windows (currently unused) |
| `src/utils/logger/*` | `winston` logger + `logMessage` (styled, error exits the process) |

## Architecture overview

```
create-damat-app <name> [options]
        │
        ▼  src/index.ts  (runCli + the `create` command)
   create(args, options)               src/commands/create.ts
        │
        ▼  ProjectCreatorFactory.create(args, options)
   ├─ validateNodeVersion()  → getBunVersion() >= MIN_SUPPORTED_BUN_VERSION
   ├─ getProjectName(...)    → arg or interactive @clack prompt (slugified)
   └─ new (module ? damatModuleCreator : damatProjectCreator)(name, options, args)
        │
        ▼  .create()
   BaseProjectCreator wires: spinner, ProcessManager, PackageManager,
   AbortController, fact box, projectPath = directoryPath/name
```

Two design patterns carried over from the original design:

- **Factory** — `ProjectCreatorFactory` chooses the concrete creator from the
  `--module` flag.
- **Template method** — `BaseProjectCreator` defines the shared skeleton
  (members + abstract `showSuccessMessage`/`setupProcessManager`); the two
  creators fill in the steps.

## Invariants / design decisions

- **Bun-only.** The version gate (`getBunVersion`), `PackageManager`
  (`bun install`/`bun run`), and `startDamat` (`bun run dev`) all assume Bun.
  `logMessage({ type: "error" })` calls `process.exit(1)`, so a failed gate ends
  the run.
- **Project names**: no dots (would break path resolution); existing
  directories are rejected. Names are slugified and lowercased. Defaults:
  `damat-backend` (project) / `damat-module` (module).
- **Fresh git history**: the starter's `.git`/`.github` are removed and a new
  `main` branch is initialized with a bootstrap commit.
- **Lockfile hygiene**: before `bun install`, non-Bun lockfiles
  (`package-lock.json`, `pnpm-lock.yaml`, plus `bun.lock`/`.bun`) are removed.
- **Cancellation**: `ProcessManager` hooks SIGTERM/SIGINT; `createAbortController`
  aborts in-flight commands and on terminate prints the success box once (if the
  project was created).
- **`--version` pinning skips `@damatjs/ui`** (it follows a different versioning
  scheme).
- **Dead-but-present helpers**: `database/*`, `gets/configStore.ts`, and
  `gets/CurrentOs.ts` are not referenced by the current create flow. They are
  documented for completeness — see [database-setup.md](./database-setup.md).

## Safe-extension guidance

- **Add an option**: extend the `options` array in `src/index.ts` and map it into
  `ProjectOptions` in the handler; thread it through the creators as needed.
- **Add a creation mode**: add a `ProjectCreator` subclass of
  `BaseProjectCreator`, then branch to it in `ProjectCreatorFactory.create`.
- **Keep UX consistent**: report via `logMessage` (remember `error` exits),
  drive long steps through `displayFactBox`, run shell work through `execute`
  with the `AbortController` signal, and wrap retriable commands in
  `ProcessManager.runProcess` (handles EAGAIN / optional ERESOLVE).
