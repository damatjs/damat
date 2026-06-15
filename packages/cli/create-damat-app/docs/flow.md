# End-to-end create flow

How `create-damat-app <name>` goes from argv to a prepared (and, for projects,
running) Damat app. Sources: `src/index.ts`, `src/commands/create.ts`,
`src/utils/projectCreator/*`, `src/utils/actions/*`.

## 1. Argv → options (`src/index.ts`)

`runCli` (from `@damatjs/cli`) parses argv against the `create` command (aliases
`init`, `new`). The handler reads the first positional as the project name and
builds `ProjectOptions`:

```ts
const options: ProjectOptions = {
  module: ctx.options.module as boolean,
  repoUrl: (ctx.options["repo-url"] as string) ?? null,
  version: (ctx.options.version as string) ?? "latest",
  directoryPath: (ctx.options["directory-path"] as string) ?? process.cwd(),
  verbose: ctx.options.verbose as boolean,
};
await create(projectName ? [projectName] : [], options);
```

`create` (`src/commands/create.ts`) is a two-liner:

```ts
const projectCreator = await ProjectCreatorFactory.create(args, options);
await projectCreator.create();
```

## 2. Factory: validate + name + pick creator (`projectCreatorFactory.ts`)

`ProjectCreatorFactory.create(args, options)`:

1. **`validateNodeVersion()`** — `getBunVersion()` (major from `Bun.version`); if
   below `MIN_SUPPORTED_BUN_VERSION` (= `1`), `logMessage({ type: "error" })`
   prints an "install Bun" link and `process.exit(1)`.
2. **`getProjectName(args, directoryPath, isModule)`** — uses `args[0]` unless it
   is missing, names an existing directory, or contains a `.`; in those cases (or
   when absent) it prompts via `@clack/prompts` `text`, validating the same rules
   and `slugify().toLowerCase()`-ing the result. Defaults: `damat-backend` /
   `damat-module`.
3. Returns `new damatModuleCreator(...)` when `options.module`, else
   `new damatProjectCreator(...)`.

## 3. BaseProjectCreator wiring (`creator.ts`)

The constructor (shared by both creators) sets up:

- `spinner` (`yocto-spinner`), `processManager` (`ProcessManager`),
  `packageManager` (`PackageManager`, verbose-aware),
  `abortController` (`createAbortController(processManager)`).
- `projectPath = path.join(directoryPath, projectName)`.
- `factBoxOptions` for the animated tips box.

`ProjectOptions` shape: `{ module?, repoUrl?, version?, directoryPath, verbose? }`.

## 4a. Project flow (`damatProjectCreator.create`)

```
initializeProject()  → setupProject()  → startServices()
```

- **initializeProject**: log a rocket banner; `spinner.start()`; show the fact
  box ("Setting up project…"); `runCloneRepo({ isModule: false, … })`; update
  the fact box ("Created project directory").
- **setupProject**: `prepareProject({ isModule: false, version, … })`;
  `spinner.success("Project Prepared")`.
- **startServices**: log "Starting damat…"; `startDamat({ directory:
  projectPath, abortController, packageManager })` (runs `bun run dev`, pipes
  stdio); set `isProjectCreated = true`.
- **setupProcessManager** registers an `onTerminated` handler that stops the
  spinner and, once, prints `showSuccessMessage()` (a `boxen` box with the `bun
  run dev` command and a GitHub link).
- **handleError** ignores abort errors (exits cleanly), otherwise stops the
  spinner and logs the error (with stack when the message mentions `bun`).

## 4b. Module flow (`damatModuleCreator.create`)

A single linear method:

- Log a rocket banner; `spinner.start()`; fact box ("Setting up plugin…").
- `cloneAndPrepareModule()`: `runCloneRepo({ isModule: true, … })`; fact box
  ("Created plugin directory"); `prepareProject({ isModule: true, … })`.
- `spinner.success("Module Prepared")`; `showSuccessMessage()` (no dev server).
- Same `handleError` shape as the project creator.

## 5. Clone (`actions/cloneRepo.ts`)

`runCloneRepo` → `cloneRepo` runs `git clone <repoUrl|default> <dir> --depth 1`
through `execute` (honouring the abort signal). Default repo depends on
`isModule` (`damat-starter-default` vs `damat-starter-module`). Then:

- `deleteGitDirectory(dir)` removes `.git` and `.github` (falls back to
  `rm -rf` / `rmdir /s /q` when `fs.rmSync` fails).
- `initializeFreshGit(...)` runs `git init -b main`, `git add .`,
  `git commit -m "chore: bootstrap project structure"` (each wrapped so a no-op
  is tolerated).

Abort errors exit the process; other errors stop the spinner and log.

## 6. Prepare (`actions/prepareProject.ts`)

A discriminated dispatch on `isModule`:

**Both**: read `package.json`, set `name = projectName`, set `packageManager =
bun@<version>` when detected, then write it back, then
`packageManager.installDependencies({ cwd, signal })` (removes stray lockfiles,
runs `bun install`). Fact box transitions "Installing dependencies…" →
"Installed Dependencies" → "Finished Preparation".

**Project only** (additionally): `PackageVersionsUpdate(packageJson, version)`
pins `@damatjs/*` deps (except `@damatjs/ui`) before writing package.json, and
appends default env vars to `.env`:

```
FRONTEND_CORS=http://localhost:8000,http://localhost:5173,http://localhost:9000,https://docs.damat.com
AUTH_CORS=<frontend ports>,https://docs.damat.com
REDIS_URL=redis://localhost:6379
JWT_SECRET=supersecret
COOKIE_SECRET=supersecret
```

## 7. Start (`commands/startDamat.ts`)

Project flow only: `exec(packageManager.getCommandStr("dev"))` (= `bun run dev`)
in the project dir with the abort signal; child `stdout`/`stderr` are piped to
the parent.

## Gotchas

- **`logMessage` with `type: "error"` calls `process.exit(1)`** — it is fatal,
  not just a print. Used for the Bun gate and connection failures.
- **The fact box drives the spinner text**, refreshing every 10s; intervals are
  tracked by `ProcessManager` and cleared on terminate.
- **Module runs never write `.env` or pin versions, and never start a server** —
  see [project-vs-module.md](./project-vs-module.md).
- **Abort handling**: Ctrl-C aborts in-flight `execute` calls and triggers the
  `onTerminated` success-box print (once) when the project was created.
