# Project vs module creation

`create-damat-app` has two creation modes, chosen by the `--module` flag in
`ProjectCreatorFactory.create`. Both extend `BaseProjectCreator`
(`src/utils/projectCreator/creator.ts`), so they share spinner/process/package/
abort wiring and the `projectPath` computation; they differ in starter repo,
preparation, and whether a dev server is started.

## Selection (`projectCreatorFactory.ts`)

```ts
return options.module
  ? new damatModuleCreator(projectName, options, args)
  : new damatProjectCreator(projectName, options, args);
```

Name prompts and defaults are mode-aware: the prompt copy says "module" vs
"project", and the default name is `damat-module` vs `damat-backend`.

## Side-by-side

| Step | Project (`damatProjectCreator`) | Module (`damatModuleCreator`) |
|---|---|---|
| Scaffolding source | clones `damat-starter-default` | local scaffold via `@damatjs/damat-cli module init` (clones only with `--repo-url`) |
| Clone + fresh git | yes (`runCloneRepo`, isModule: false) | no by default (`runScaffoldModule`); clones with `--repo-url` |
| package.json: name + `packageManager` | yes | yes |
| Pin `@damatjs/*` to `--version` | **yes** (`PackageVersionsUpdate`) | **no** |
| Write default `.env` | **yes** (CORS, REDIS_URL, JWT/COOKIE secrets) | **no** |
| `bun install` | yes | yes |
| Start `bun run dev` | **yes** (`startDamat`) | **no** |
| Success message | box with the `bun run dev` command | box with a "build your module" + GitHub note |
| Control flow | `initializeProject → setupProject → startServices` | single `cloneAndPrepareModule` then success |
| `isProjectCreated` set | yes (after starting services) | not set (success printed inline) |

## Why the differences

- **A project is a runnable app**, so it gets opinionated defaults (`.env`,
  pinned versions) and is launched immediately so the developer sees it working.
- **A module is a library package** authored against the Damat module runtime; it
  has no app-level env and no server to start, so preparation stops after
  `bun install`. The generated module is then driven with the `damat module …`
  scripts (see `@damatjs/damat-cli`).

## Shared base (`BaseProjectCreator`)

Holds `spinner`, `processManager`, `packageManager`, `abortController`,
`factBoxOptions`, `projectName`, `projectPath`, and the flags `isProjectCreated`
/ `printedMessage`. Declares abstract `showSuccessMessage()` and
`setupProcessManager()`. Both creators implement `setupProcessManager` to print
the success box exactly once on terminate when `isProjectCreated` is true — note
the module creator never sets `isProjectCreated`, so it relies on the inline
`showSuccessMessage()` call in `create()` instead.

## Gotchas

- **`prepareProject.ts`** is one default-exported function that dispatches on
  `isModule` to `prepareModule` / `prepareProject`. The TypeScript return type is
  conditional (`void` for module, `string | undefined` for project), though the
  project path currently returns nothing meaningful.
- **The module path skips `.env` entirely** — do not assume a scaffolded module
  has env defaults; the module starter ships its own `.env.example`.
- **Version pinning is project-only** and excludes `@damatjs/ui`
  (`versionsUpdater.ts`'s `shouldUpdateVersion`).
- Adding a third mode means a new `BaseProjectCreator` subclass plus a branch in
  the factory; keep the success-message / terminate handling consistent.
