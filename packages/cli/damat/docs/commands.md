# App-lifecycle commands: create, dev, build, start

The top-level commands that drive a Damat **application** (not a module
package). `create` scaffolds a new app; `dev`/`build`/`start` each write a
generated entry under `.damat/` and `spawn` Bun, then return the child's exit
code. Sources: `src/command/create/index.ts`, `src/command/dev.ts`,
`src/command/build.ts`, `src/command/start.ts`.

The lifecycle commands resolve paths against `ctx.cwd` (the project root) and
stream child stdio with `stdout: "inherit", stderr: "inherit"`.

## `create <name>` (alias `new`) — `src/command/create/index.ts`

Scaffold a new backend app **offline** from embedded templates
(`src/command/create/scaffold/templates/` — the same pattern as `module init`,
no starter repo, no network for the scaffold itself). Name must be kebab-case
(same guard rationale as module ids: it becomes a directory, a package name,
and a database name).

Behaviour:

1. Guard the name and refuse an existing target dir (`--dir` overrides
   `./<name>`).
2. Write the tree: `package.json` (deps pinned `^CLI_VERSION`, or `--pin`),
   `damat.config.ts` (empty `modules: {}` block that `module add` inserts
   into), standalone `tsconfig.json` with the `@workflows` aliases, README,
   `.gitignore`, `.env.example` (placeholders), `.env` (generated
   `JWT_SECRET`/`COOKIE_SECRET` via `randomBytes`, `REDIS_URL` commented out so
   a password-protected localhost redis can't fail the first boot), an example
   `src/api/routes/hello/route.ts`, an empty `src/workflows/index.ts` barrel,
   and `tests/smoke.test.ts`. Empty `src/modules` is pre-created.
3. `git init -b main` + bootstrap commit (skippable with `--no-git`; a missing
   git only warns).
4. `bun install` (skippable with `--no-install`; a failure warns with manual
   instructions — the scaffold itself is complete either way).

This is the getting-started entry point for new projects:
`bunx @damatjs/damat-cli@latest create my-app`. (The old `create-damat-app`
wrapper that used to delegate here was retired.)

## `clone <source> [dir]` — `src/command/clone/index.ts`

`git clone` with extras. A plain `damat clone <url>` behaves like git clone
(full history, original `.git` kept); the extras are what git clone can't do:

- **Sources**: full URLs (`https://…`, `git@…`) or github shorthand
  (`user/repo`), each with an optional `#ref` suffix (`--branch` overrides it).
- **Subdirectory extraction**: `user/repo/sub/dir` shallow-clones to a temp dir
  and copies only that subtree out (minus `.git`/`node_modules`, with the same
  `..`-escape guard as module sources). Extraction can't carry history — the
  command says so and suggests `--fresh`.
- **`--fresh`**: strip `.git`/`.github`, `git init -b main`, bootstrap commit —
  the starter-template behavior. Failures here only warn (the clone already
  succeeded).
- **`--name <pkg>`**: rewrite `package.json`'s `name` (indentation preserved).
- **`--install`**: `bun install` afterwards (failure warns).
- **`--depth <n>`**: shallow clone (plain-clone mode only; subdir mode is
  always depth 1).

Safety: git argv always passes `--` before the URL so a hostile source can
never be parsed as a git flag; a failed clone removes the half-written target.

## `dev` (alias `d`) — `src/command/dev.ts`

Start the development server with hot reload.

Options:

| Option    | Alias | Type    | Default | Effect                                          |
| --------- | ----- | ------- | ------- | ----------------------------------------------- |
| `--port`  | `-p`  | number  | `3000`  | Port (only used if `process.env.PORT` is unset) |
| `--clear` | `-c`  | boolean | `false` | `console.clear()` on start                      |

Behaviour:

1. Ensure `<cwd>/.damat/` exists.
2. Write `<cwd>/.damat/dev-entry.ts`:
   ```ts
   import { runEntry } from "@damatjs/framework/entry";
   runEntry();
   ```
3. Optionally `console.clear()`.
4. `loadEnv(process.env.NODE_ENV || "development", process.cwd())` (from
   `@damatjs/load-env`).
5. `spawn(["bun", "--watch", "--no-clear-screen", tempFile])` with
   `env: { ...process.env, PORT: process.env.PORT ?? String(port) }`.
6. `await result.exited`, then best-effort `unlinkSync(tempFile)`.

> `PORT` precedence: an existing `process.env.PORT` wins over `--port`.

## `build` (alias `b`) — `src/command/build.ts`

Build for production.

Options:

| Option     | Alias | Type    | Default       | Effect                             |
| ---------- | ----- | ------- | ------------- | ---------------------------------- |
| `--output` | `-o`  | string  | `.damat/dist` | Output directory (joined to `cwd`) |
| `--target` | `-t`  | string  | `bun`         | `bun` or `node`                    |
| `--minify` | `-m`  | boolean | `false`       | Pass `--minify` to `bun build`     |

Behaviour:

1. Ensure `.damat/` exists. If `outputDir` exists, log "Cleaning old build…" and
   `rmSync` it; then recreate it.
2. Write `<cwd>/.damat/build-entry.ts` (same `runEntry()` content as dev).
3. `bun build <build-entry.ts> --outfile <outputDir>/entry.js --target <target>
--packages external` (+ `--minify` if set). `--packages external` keeps
   dependencies out of the bundle.
4. `await exited`, best-effort `unlinkSync(build-entry.ts)`.
5. On success **and** if `<cwd>/src` exists:
   - Recursively copy `src/` → `<outputDir>/src` (`copyDir` helper).
   - If `<cwd>/damat.config.ts` exists, build it too:
     `bun build damat.config.ts --outfile <outputDir>/damat.config.js
--target <target> --external pg-cloudflare`.
   - Log "Build complete!".

Returns the bundle step's exit code (the config build's code is awaited but not
propagated).

## `start` (alias `s`) — `src/command/start.ts`

Run the production build.

Options:

| Option     | Alias | Type   | Default       | Effect                      |
| ---------- | ----- | ------ | ------------- | --------------------------- |
| `--output` | `-o`  | string | `.damat/dist` | Build directory to run from |

Behaviour:

1. `distPath = <cwd>/<output>/entry.js`. If it does not exist →
   `logger.error("Build not found. Run \`damat build\` first.")`, return `1`.
2. `loadEnv(process.env.NODE_ENV || "production", process.cwd())`.
3. `spawn(["bun", "run", distPath])` with `env: { ...process.env }`.
4. Return the child exit code.

## Shared patterns & gotchas

- **`.damat/` scratch dir**: `dev` and `build` write a generated `runEntry()`
  entry there and best-effort delete it after the child exits (wrapped in
  `try/catch {}`). If a process is killed hard, a stale `*-entry.ts` may remain;
  it is overwritten on the next run.
- **Env loading differs by command**: `dev` defaults `NODE_ENV` to
  `development`, `start` to `production`. `build` does **not** call `loadEnv`
  (it only bundles).
- **`runEntry` / `@damatjs/framework/entry`** is the real app bootstrap; the CLI
  only generates the one-line entry that calls it.
- **Target `node`** changes the `bun build --target` but the runner is still
  `bun run` for `start`; producing a Node-runnable artifact is the framework
  entry's concern, not the CLI's.
- **No `dev` cleanup on SIGINT**: the temp file is only removed after
  `result.exited` resolves; Ctrl-C during watch leaves the temp file for the
  next run to overwrite.
