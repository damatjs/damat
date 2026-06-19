# Package manager & command execution

`create-damat-app` is **Bun-only**. There is one `PackageManager`
(`src/utils/package/manager.ts`) hardwired to Bun, a shell `execute` wrapper
(`src/utils/commands/executor.ts`), and a `ProcessManager`
(`src/utils/commands/manager.ts`) that adds retries and lifecycle hooks.

> The `PackageManager` detects only the Bun version and runs Bun — there is no
> npm / yarn / pnpm detection. The `src/utils/__tests__/packageManager.test.ts`
> suite tests a multi-manager API (`useNpm`/`useYarn`/`usePnpm`,
> `getPackageManager`, `getCommandStr` throwing) that does **not** match the
> current class; treat it as stale, not as the contract.

## `PackageManager` (`package/manager.ts`)

Constructed with a `ProcessManager` and `{ verbose? }`. Key methods:

| Method | Behaviour |
|---|---|
| `getVersion(execOptions)` (private) | `bun -v` via `execute`; returns the trimmed version or `undefined` |
| `setPackageManager(execOptions)` | resolves + stores the Bun version (retried via `runProcess`); if Bun is absent, `logMessage({ type: "error" })` (which exits) — "damat currently only supports bun" |
| `removeLockFiles(dir)` | deletes `bun.lock`, `package-lock.json`, `pnpm-lock.yaml`, `.bun` if present |
| `installDependencies(execOptions)` | removes stray lockfiles in `cwd`, then `bun install` (via `runProcess`, `ignoreERESOLVE: true`) |
| `runCommand(cmd, execOptions, verbose?)` | `bun run <cmd>` via `runProcess` |
| `rundamatCommand(cmd, execOptions, verbose?)` | `bun run damat <cmd>` via `runProcess` |
| `getCommandStr(cmd)` | returns the string `bun run <cmd>` |
| `getPackageManagerString()` | `bun@<version>` when a version was detected, else `undefined` (written into the scaffolded project's `package.json` `packageManager` field) |

`getCommandStr("dev")` → `"bun run dev"` is what `startDamat` and the success
boxes use.

## `execute` (`commands/executor.ts`)

```ts
execute(command: SpawnParams | PromiseExecParams, { verbose?, needOutput? }): Promise<{ stdout?, stderr? }>
```

Two paths:

- **verbose** → `spawnSync(commandStr, { shell: true, stdio: pipe | inherit })`.
  Throws on `error`/non-zero status; converts SIGINT/SIGTERM into the abort error
  (`getAbortError()`); when `needOutput`, logs captured output.
- **non-verbose** → promisified `child_process.exec` (`util.promisify(exec)`),
  returning `{ stdout, stderr }`.

Both merge `process.env` with any `options.env`. `needOutput` only matters in
verbose mode (it captures rather than streaming live).

## `ProcessManager` (`commands/manager.ts`)

- Tracks `intervals` (the fact-box timers) and clears them on terminate.
- `onTerminated(fn)` registers `fn` for both `SIGTERM` and `SIGINT`.
- `addInterval(interval)` registers a timer for cleanup.
- `runProcess({ process, ignoreERESOLVE })` runs `process()` with up to
  `MAX_RETRIES` (= 3) retries when the error code is `EAGAIN` (transient
  bun/bunx failure); optionally swallows `ERESOLVE`; rethrows anything else.

## `createAbortController` (`commands/createAbortController.ts`)

Returns an `AbortController` whose `.abort()` is wired to `ProcessManager`'s
terminate hook, so Ctrl-C cancels in-flight `execute` calls (they pass
`signal: abortController.signal`). `isAbortError(e)` checks `e.code ===
"ABORT_ERR"`; `getAbortError()` returns the synthetic abort error object used by
`execute` on SIGINT/SIGTERM.

## `PackageVersionsUpdate` (`package/versionsUpdater.ts`)

```ts
PackageVersionsUpdate(packageJsonOrPath, version, { applyChanges? }): packageJson
```

Rewrites every `dependencies`/`devDependencies` entry that
`shouldUpdateVersion` accepts (`@damatjs/*`, except `@damatjs/ui`) to the given
`version`. Accepts an in-memory object or a path; with `applyChanges` and a path,
writes the file back. The project creator calls it on the in-memory package.json
before writing (so `applyChanges` is left default).

## Gotchas

- **Bun is mandatory.** No Node/npm fallback exists; a missing Bun ends the run
  via the fatal `logMessage` error in `setPackageManager`.
- **`getCommandStr` always returns `bun run <cmd>`** — unlike the stale test's
  expectation of a thrown error / per-manager formats.
- **`installDependencies` deletes other managers' lockfiles** in the target dir
  first, to keep the project on a single Bun lockfile.
- **EAGAIN retries are silent** (up to 3); persistent failures rethrow and bubble
  to the creator's `handleError`.
- **`getPackageManagerString` needs a detected version** — if `setPackageManager`
  was never run (or Bun version unknown), it returns `undefined` and the
  scaffolded `package.json` omits the `packageManager` field.
