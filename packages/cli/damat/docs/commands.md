# App-lifecycle commands: dev, build, start

The three top-level commands that drive a Damat **application** (not a module
package). Each writes a generated entry under `.damat/` and `spawn`s Bun, then
returns the child's exit code. Sources: `src/command/dev.ts`,
`src/command/build.ts`, `src/command/start.ts`.

All three resolve paths against `ctx.cwd` (the project root) and stream child
stdio with `stdout: "inherit", stderr: "inherit"`.

## `dev` (alias `d`) — `src/command/dev.ts`

Start the development server with hot reload.

Options:

| Option | Alias | Type | Default | Effect |
|---|---|---|---|---|
| `--port` | `-p` | number | `3000` | Port (only used if `process.env.PORT` is unset) |
| `--clear` | `-c` | boolean | `false` | `console.clear()` on start |

Behaviour:

1. Ensure `<cwd>/.damat/` exists.
2. Write `<cwd>/.damat/dev-entry.ts`:
   ```ts
   import { runEntry } from '@damatjs/framework/entry';
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

| Option | Alias | Type | Default | Effect |
|---|---|---|---|---|
| `--output` | `-o` | string | `.damat/dist` | Output directory (joined to `cwd`) |
| `--target` | `-t` | string | `bun` | `bun` or `node` |
| `--minify` | `-m` | boolean | `false` | Pass `--minify` to `bun build` |

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

| Option | Alias | Type | Default | Effect |
|---|---|---|---|---|
| `--output` | `-o` | string | `.damat/dist` | Build directory to run from |

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
