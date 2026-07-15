# Neutral CLI Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Stop after each task, report it, and wait for explicit user approval.

**Goal:** Make `@damatjs/cli` an embeddable, framework-neutral command runtime while preserving the existing Damat CLI experience through an adapter owned by `@damatjs/damat-cli`.

**Architecture:** The core CLI receives a `CliDefinition` plus a small runtime object containing arguments, cwd, environment, output, and a structural logger. It owns an invocation-local command registry and creates a project-config accessor only when `configLoader` is provided. It returns `CliRunResult` and never creates Damat services or terminates the process. The Damat executable supplies the process-backed runtime and `@damatjs/logger` adapter.

**Tech Stack:** Bun, TypeScript ESM, CAC, existing `@damatjs/logger` only in the Damat adapter.

## Global Constraints

- Complete exactly one task, report it, and wait for explicit user approval before the next task.
- Preserve the existing uncommitted `packages/core/cli/src/config/` split; build on it instead of reverting it.
- Do not modify `.github/workflows/test.yml` or `packages/cli/damat/src/command/module/scaffold/agents.generated.ts`.
- Use Bun only.
- Use TDD: failing focused test, minimal implementation, passing focused test, package regression.
- Keep every new or touched production, test, script, fixture, and generated code file at 100 physical lines or fewer.
- When a code file would exceed 100 lines, split it by concern into clearly named sibling files or subfolders and import/call those units explicitly; generated code receives no exemption.
- Until Task 7 installs the reusable checker, verify every task's touched code files with `wc -l` before reporting; Task 7 then verifies the whole Phase 1 surface automatically.
- Do not bump package versions.
- Update current documentation and `releases/cli/next.md` for observable behavior.
- Do not commit automatically; the user controls checkpoint commits while the worktree contains unrelated changes.

---

## File Map

### New files

- `packages/core/cli/src/types/io.ts` — structural logger and output interfaces.
- `packages/core/cli/src/types/runtime.ts` — injected runtime and run-result contracts.
- `packages/core/cli/src/runtime/defaultOutput.ts` — console-backed neutral output adapter.
- `packages/core/cli/src/runtime/defaultLogger.ts` — dependency-free logger used when none is injected.
- `packages/core/cli/src/runtime/createRuntime.ts` — process-backed defaults without process termination.
- `packages/core/cli/src/runtime/index.ts` — runtime exports.
- `packages/core/cli/src/run/executeCommand.ts` — validates and invokes one command without exiting.
- `packages/core/cli/src/tests/runtime.test.ts` — runtime injection and default-adapter tests.
- `packages/core/cli/src/tests/defaultLogger.test.ts` — default logger delegation tests.
- `packages/core/cli/src/tests/defaultOutput.test.ts` — default output delegation tests.
- `packages/core/cli/src/tests/configNonError.test.ts` — non-Error config-loader failure test.
- `packages/cli/damat/src/runtime.ts` — Damat logger/process adapter.
- `scripts/check-code-lines.ts` — reusable physical-line limit checker.
- `scripts/tests/check-code-lines.test.ts` — checker behavior tests.
- `releases/cli/next.md` — unreleased neutral-runtime migration notes.

### Modified files

- `packages/core/cli/src/types/command.ts` — use `CliLogger` in command context.
- `packages/core/cli/src/types/cli.ts` — opt-in banner/verbose and runtime-compatible error hook.
- `packages/core/cli/src/types/index.ts` — export new contracts.
- `packages/core/cli/src/run/runCli.ts` — invocation-local orchestration returning `CliRunResult`.
- `packages/core/cli/src/run/buildCommand.ts` — accept explicit args/cwd/logger.
- `packages/core/cli/src/run/registerCommand.ts` — delegate execution and capture results without exiting.
- `packages/core/cli/src/run/helpCommand.ts` — return help results without exiting.
- `packages/core/cli/src/run/index.ts` — export execution helper.
- `packages/core/cli/src/registry/index.ts` — export a registry factory instead of a singleton.
- `packages/core/cli/src/config/load.ts` — remove module-global cache and process cwd default.
- `packages/core/cli/src/config/withConfig.ts` — own cache inside one accessor.
- `packages/core/cli/src/config/index.ts` — normalized exports/formatting.
- `packages/core/cli/src/help/*.ts` and `packages/core/cli/src/utils/banner.ts` — write through `CliOutput`.
- `packages/core/cli/src/utils/output/*.ts` — depend on `CliLogger`; verbose is explicit.
- `packages/core/cli/src/index.ts` — export runtime.
- `packages/core/cli/package.json` — remove logger and dotenv dependencies.
- `packages/core/cli/README.md` and `packages/core/cli/docs/*.md` — current neutral API.
- `packages/core/cli/src/tests/*.test.ts` — remove process-exit/global-state assumptions.
- `packages/cli/damat/src/cli.ts` — inject the Damat runtime and set `process.exitCode`.
- `packages/cli/damat/src/__tests__/runtime.test.ts` — Damat runtime adapter tests.
- `packages/cli/damat/src/command/__tests__/*` — preserve composed command behavior.
- `packages/cli/damat/package.json` only if its logger dependency is not already declared.
- `package.json` — expose targeted and repository-wide line-count checks.
- `releases/cli/README.md` — add Unreleased entry.

## Stable Interfaces Produced by Phase 1

```ts
export interface CliLogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  success(message: string, context?: Record<string, unknown>): void;
  skip(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(
    message: string,
    error?: unknown,
    context?: Record<string, unknown>,
  ): void;
}

export interface CliOutput {
  write(message?: string): void;
}

export interface CliRuntime {
  args: readonly string[];
  cwd: string;
  env: Readonly<Record<string, string | undefined>>;
  logger: CliLogger;
  output: CliOutput;
}

export interface CliRunResult {
  exitCode: number;
  command?: string;
}

export function createRuntime(overrides?: Partial<CliRuntime>): CliRuntime;

export async function runCli(
  definition: CliDefinition,
  runtime?: Partial<CliRuntime>,
): Promise<CliRunResult>;
```

These exact names are consumed by Phase 2 command packages.

---

### Task 1: Add neutral runtime contracts and dependency-free defaults

**Files:**

- Create: `packages/core/cli/src/types/io.ts`
- Create: `packages/core/cli/src/types/runtime.ts`
- Create: `packages/core/cli/src/runtime/defaultOutput.ts`
- Create: `packages/core/cli/src/runtime/defaultLogger.ts`
- Create: `packages/core/cli/src/runtime/createRuntime.ts`
- Create: `packages/core/cli/src/runtime/index.ts`
- Create: `packages/core/cli/src/tests/runtime.test.ts`
- Create: `packages/core/cli/src/tests/defaultLogger.test.ts`
- Create: `packages/core/cli/src/tests/defaultOutput.test.ts`
- Create: `packages/core/cli/src/tests/configNonError.test.ts`
- Modify: `packages/core/cli/src/types/command.ts`
- Modify: `packages/core/cli/src/types/index.ts`
- Modify: `packages/core/cli/src/index.ts`
- Modify: `packages/core/cli/src/config/load.ts`

**Interfaces:**

- Consumes: no Damat package; only platform `console`, `process.argv`, `process.cwd()`, and `process.env` inside `createRuntime`.
- Produces: `CliLogger`, `CliOutput`, `CliRuntime`, `CliRunResult`, `createRuntime` exactly as declared above.

- [x] **Step 1: Write the failing structural-runtime tests**

Add tests proving:

```ts
const runtime = createRuntime({
  args: ["build"],
  cwd: "/workspace",
  env: { MODE: "test" },
  logger,
  output,
});

expect(runtime.args).toEqual(["build"]);
expect(runtime.cwd).toBe("/workspace");
expect(runtime.env.MODE).toBe("test");
expect(runtime.logger).toBe(logger);
expect(runtime.output).toBe(output);
```

Also assert that the default logger/output can receive every supported method without throwing.

- [x] **Step 2: Run the focused test and confirm the missing exports fail**

Run:

```bash
bun test packages/core/cli/src/tests/runtime.test.ts
```

Expected: failure because `createRuntime`, `CliLogger`, and `CliOutput` do not exist.

- [x] **Step 3: Implement the structural interfaces and defaults**

Use no `@damatjs/logger` imports. `createDefaultLogger` delegates to `console.debug/log/warn/error`; `createDefaultOutput` delegates to `console.log`. `createRuntime` copies `process.argv.slice(2)`, `process.cwd()`, and `process.env` only when the caller omitted those values.

- [x] **Step 4: Change `CommandContext.logger` from `ILogger` to `CliLogger`**

Keep the property name `logger` so existing command handlers remain structurally compatible.

- [x] **Step 5: Run focused and type tests**

Run:

```bash
bun test packages/core/cli/src/tests/runtime.test.ts packages/core/cli/src/tests/runHelpers.test.ts
bun run --cwd=packages/core/cli build
```

Expected: both test files pass and TypeScript accepts an `@damatjs/logger` instance structurally without importing its type.

- [x] **Step 6: Report Task 1 and wait**

Report new interfaces, focused test counts, build status, and confirm no existing dependencies were removed yet. Do not start Task 2.

---

### Task 2: Make command context and configuration invocation-local

**Files:**

- Modify: `packages/core/cli/src/run/buildCommand.ts`
- Modify: `packages/core/cli/src/config/load.ts`
- Modify: `packages/core/cli/src/config/withConfig.ts`
- Modify: `packages/core/cli/src/config/index.ts`
- Modify: `packages/core/cli/src/tests/config.test.ts`
- Modify: `packages/core/cli/src/tests/configExtra.test.ts`
- Modify: `packages/core/cli/src/tests/runHelpers.test.ts`

**Interfaces:**

- Consumes: `CliRuntime` and `CliLogger` from Task 1.
- Produces:

```ts
export function buildCommandContext(
  commandName: string,
  rawArgs: readonly string[],
  options: Record<string, unknown>,
  runtime: Pick<CliRuntime, "cwd" | "logger">,
): CommandContext;

export async function loadConfig<T = unknown>(
  loaderConfig: ConfigLoader | undefined,
  cwd: string,
): Promise<T | null>;

export function withConfig<T>(
  loaderConfig: ConfigLoader | undefined,
  cwd: string,
): { get(): Promise<T | null>; clear(): void };
```

- [x] **Step 1: Rewrite tests to pass explicit args and cwd**

Tests must prove two simultaneous config accessors cache independently and clearing one does not clear the other.

- [x] **Step 2: Run focused tests and confirm old global assumptions fail**

Run:

```bash
bun test packages/core/cli/src/tests/config.test.ts packages/core/cli/src/tests/configExtra.test.ts packages/core/cli/src/tests/runHelpers.test.ts
```

Expected: failures until the new explicit parameters and accessor-local cache exist.

- [x] **Step 3: Remove module-global `cachedConfig`**

Make `loadConfig` a single load operation. Put caching in the closure returned by `withConfig`, using a boolean sentinel so a cached `null` is distinguishable from not-yet-loaded.

- [x] **Step 4: Preserve the user’s config-directory split**

Keep `load.ts`, `withConfig.ts`, and `index.ts`; normalize quote/semicolon formatting without recreating deleted `src/config.ts`.

- [x] **Step 5: Pass explicit raw args into command context construction**

Do not read `process.argv` or `process.cwd()` inside `buildCommandContext`.

- [x] **Step 6: Verify Task 2**

Run:

```bash
bun test packages/core/cli/src/tests/config.test.ts packages/core/cli/src/tests/configExtra.test.ts packages/core/cli/src/tests/runHelpers.test.ts
bun run --cwd=packages/core/cli build
```

Expected: focused tests and build pass; `rg` finds no `process.argv` or `process.cwd()` in `config/` or `run/buildCommand.ts`.

- [x] **Step 7: Report Task 2 and wait**

---

### Task 3: Replace the singleton registry with an invocation-owned registry

**Files:**

- Modify: `packages/core/cli/src/registry/index.ts`
- Modify: `packages/core/cli/src/run/helpCommand.ts`
- Modify: `packages/core/cli/src/run/runCli.ts`
- Modify: `packages/core/cli/src/tests/registry.test.ts`
- Modify: `packages/core/cli/src/tests/helpCommand.test.ts`
- Modify: `packages/core/cli/src/tests/runCli.test.ts`

**Interfaces:**

- Consumes: `CommandRegistryImpl`.
- Produces:

```ts
export function createCommandRegistry(): CommandRegistry;
```

`handleHelpCommand` receives the registry as a parameter; no production path calls `getRegistry()`.

- [x] **Step 1: Add isolation tests**

Create two registries, register `alpha` in one and `beta` in the other, and assert neither leaks. Add a concurrent `runCli` test whose two command sets remain independent.

- [x] **Step 2: Run the tests and confirm singleton behavior fails the concurrency assertion**

Run:

```bash
bun test packages/core/cli/src/tests/registry.test.ts packages/core/cli/src/tests/helpCommand.test.ts packages/core/cli/src/tests/runCli.test.ts
```

- [x] **Step 3: Implement the registry factory and inject it**

Construct one registry at the beginning of each `runCli` call. Pass it to help and dispatch functions. Remove production reliance on `clearRegistry`.

- [x] **Step 4: Remove singleton helper exports after migrating tests**

The public registry surface becomes `CommandRegistryImpl` plus `createCommandRegistry`. No global command state remains.

- [x] **Step 5: Verify Task 3**

Run:

```bash
bun test packages/core/cli/src/tests/registry.test.ts packages/core/cli/src/tests/helpCommand.test.ts packages/core/cli/src/tests/runCli.test.ts
bun run --cwd=packages/core/cli build
```

Expected: all pass and `rg "getRegistry|clearRegistry" packages/core/cli/src --glob '!tests/**'` returns no matches.

- [x] **Step 6: Report Task 3 and wait**

---

### Task 4: Return exit results instead of terminating the process

**Files:**

- Create: `packages/core/cli/src/run/executeCommand.ts`
- Modify: `packages/core/cli/src/run/registerCommand.ts`
- Modify: `packages/core/cli/src/run/helpCommand.ts`
- Modify: `packages/core/cli/src/run/runCli.ts`
- Modify: `packages/core/cli/src/run/index.ts`
- Modify: `packages/core/cli/src/tests/registerCommand.test.ts`
- Modify: `packages/core/cli/src/tests/helpCommand.test.ts`
- Modify: `packages/core/cli/src/tests/runCli.test.ts`

**Interfaces:**

- Consumes: `CliRuntime`, invocation registry, optional project-config accessor.
- Produces:

```ts
export async function executeCommand(
  command: Command,
  commandName: string,
  rawArgs: readonly string[],
  parsedOptions: Record<string, unknown>,
  definition: CliDefinition,
  runtime: CliRuntime,
  projectConfig: unknown,
): Promise<CliRunResult>;
```

- [x] **Step 1: Replace exit-spy tests with result assertions**

Representative assertion:

```ts
const result = await runCli(definition, { args: ["build"], logger, output });
expect(result).toEqual({ exitCode: 7, command: "build" });
```

Add a test proving code after `await runCli(...)` executes, demonstrating the host process was not terminated.

- [x] **Step 2: Run focused tests and verify they fail against `Promise<void>`**

Run:

```bash
bun test packages/core/cli/src/tests/registerCommand.test.ts packages/core/cli/src/tests/helpCommand.test.ts packages/core/cli/src/tests/runCli.test.ts
```

- [x] **Step 3: Centralize validation/config/error/handler execution**

`executeCommand` applies coercion/defaults/validation, loads project config once, builds explicit context, calls `onError`, and returns an exit code. All command paths use it.

- [x] **Step 4: Parse explicit runtime arguments with CAC**

Use CAC’s non-auto-run form and `runMatchedCommand()` so the caller-provided argument array is parsed without mutating `process.argv`.

- [x] **Step 5: Remove every `process.exit` from the core package**

Help returns `{ exitCode: 0 }`; unknown command returns `{ exitCode: 1 }`; handler errors use `getExitCode(error)`.

- [x] **Step 6: Verify Task 4**

Run:

```bash
bun test packages/core/cli/src/tests/registerCommand.test.ts packages/core/cli/src/tests/helpCommand.test.ts packages/core/cli/src/tests/runCli.test.ts
bun run --cwd=packages/core/cli build
rg -n "process\.exit|process\.argv" packages/core/cli/src --glob '!tests/**'
```

Expected: tests/build pass; the final search returns no matches outside the process-default runtime adapter, which may read `process.argv` but never call `process.exit`.

- [x] **Step 7: Report Task 4 and wait**

---

### Task 5: Make presentation policies opt-in and remove Damat-specific diagnostics

**Files:**

- Modify: `packages/core/cli/src/types/cli.ts`
- Modify: `packages/core/cli/src/run/runCli.ts`
- Modify: `packages/core/cli/src/help/printDefaultHelp.ts`
- Modify: `packages/core/cli/src/help/printCommandSpecificHelp.ts`
- Modify: `packages/core/cli/src/utils/banner.ts`
- Modify: `packages/core/cli/src/utils/output/reportError.ts`
- Modify: affected help/banner/output tests.

**Interfaces:**

- Consumes: `CliOutput`, `CliRuntime.env`, explicit parsed verbose state.
- Produces: no implicit banner, no implicit verbose flag, no `DAMAT_DEBUG` lookup in core.

- [x] **Step 1: Add policy tests**

Prove that a minimal config prints no banner and exposes no verbose option. Prove that configured banner/verbose behavior still works. Prove verbose error details depend on explicit runtime/config state rather than `DAMAT_DEBUG`.

- [x] **Step 2: Run focused tests and confirm current defaults fail**

Run:

```bash
bun test packages/core/cli/src/tests/banner.test.ts packages/core/cli/src/tests/help.test.ts packages/core/cli/src/tests/helpFormat.test.ts packages/core/cli/src/tests/reportError.test.ts packages/core/cli/src/tests/runCli.test.ts
```

- [x] **Step 3: Route presentation through `CliOutput`**

Replace direct `console.log` calls in help/banner/output helpers with injected `output.write`.

- [x] **Step 4: Make banner and verbose opt-in**

Only render a banner when `config.banner` is an object. Only register verbose when `config.verbose?.enabled === true`.

- [x] **Step 5: Remove Damat environment knowledge**

`reportError` receives `{ verbose: boolean }`; the Damat adapter may map `DAMAT_DEBUG` to that policy.

- [x] **Step 6: Verify Task 5**

Run the focused tests plus `bun run --cwd=packages/core/cli build` and confirm production core files do not contain `DAMAT_`.

- [x] **Step 7: Report Task 5 and wait**

---

### Task 6: Add the Damat runtime adapter and preserve executable behavior

**Files:**

- Create: `packages/cli/damat/src/runtime.ts`
- Modify: `packages/cli/damat/src/cli.ts`
- Test: `packages/cli/damat/src/__tests__/runtime.test.ts`
- Test: existing Damat CLI command/help tests.

**Interfaces:**

- Consumes: `CliRuntime`, `CliRunResult`, `runCli` from core and `Logger` from `@damatjs/logger`.
- Produces:

```ts
export function createDamatRuntime(): CliRuntime;
```

- [x] **Step 1: Write adapter tests**

Assert that Damat runtime uses `process.argv.slice(2)`, `process.cwd()`, `process.env`, a timestamp-disabled Damat `Logger`, and console output.

- [x] **Step 2: Run the focused test and confirm the adapter is missing**

Run:

```bash
bun test packages/cli/damat/src/__tests__/runtime.test.ts
```

- [x] **Step 3: Implement `createDamatRuntime` and update the entry point**

The executable pattern is:

```ts
const result = await runCli(definition, createDamatRuntime());
process.exitCode = result.exitCode;
```

Keep Damat’s boxed banner and verbose behavior explicitly configured in `CliDefinition`. Keep the final fatal-error catch in the executable, not the core.

- [x] **Step 4: Verify all Damat commands still compose**

Run:

```bash
bun test packages/cli/damat/src
bun run --cwd=packages/cli/damat build
```

Expected: command registration/help/version behavior passes with the same user-visible Damat defaults.

- [x] **Step 5: Report Task 6 and wait**

---

### Task 7: Enforce the 100-line code-file rule

**Files:**

- Create: `scripts/check-code-lines.ts`
- Create: `scripts/tests/check-code-lines.test.ts`
- Modify: `package.json`
- Split: every code file created or modified by Tasks 1-6 that exceeds 100 physical lines.

**Interfaces:**

- Consumes: file/directory arguments and the repository filesystem.
- Produces:

```ts
export interface LineViolation {
  path: string;
  lines: number;
}

export function findLineViolations(paths: readonly string[]): LineViolation[];
```

- [x] **Step 1: Write checker tests**

Use temporary fixtures to prove that 100 lines passes, 101 lines fails, directories recurse, non-code files are ignored, and generated `.ts` files are checked.

- [x] **Step 2: Run the focused tests and confirm the checker is missing**

Run:

```bash
bun test scripts/tests/check-code-lines.test.ts
```

- [x] **Step 3: Implement the checker in focused files**

Check `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, and `.cjs` files. Ignore only dependency/build/VCS directories (`node_modules`, `dist`, `.git`, `.turbo`). Print every violation as `<path>: <lines> lines (maximum 100)` and exit nonzero from the executable entry when violations exist.

- [x] **Step 4: Add root commands**

Expose:

```json
{
  "check:lines": "bun scripts/check-code-lines.ts packages backend apps scripts",
  "check:lines:cli": "bun scripts/check-code-lines.ts packages/core/cli/src packages/cli/damat/src/runtime.ts packages/cli/damat/src/__tests__"
}
```

- [x] **Step 5: Split all Phase 1 violations**

Each split file must have one named concern. Test suites split by behavior; shared setup moves into a named helper. Runtime orchestration splits into parser, dispatcher, execution, and result units rather than generic `utils.ts` buckets.

- [x] **Step 6: Verify Task 7**

Run:

```bash
bun test scripts/tests/check-code-lines.test.ts
bun run check:lines:cli
bun test packages/core/cli/src/tests
bun run --cwd=packages/core/cli build
bun test packages/cli/damat/src
bun run --cwd=packages/cli/damat build
```

Expected: all commands pass and `check:lines:cli` reports zero violations.

- [x] **Step 7: Report Task 7 and wait**

Report the before/after file count, every decomposition performed, and verification results. Do not start Task 8.

---

### Task 8: Remove core dependencies, update documentation, and run the phase gate

**Files:**

- Modify: `packages/core/cli/package.json`
- Modify: `bun.lock`
- Modify: `packages/core/cli/README.md`
- Modify: `packages/core/cli/docs/README.md`
- Modify: affected files under `packages/core/cli/docs/`
- Create: `releases/cli/next.md`
- Modify: `releases/cli/README.md`

**Interfaces:**

- Consumes: completed neutral API.
- Produces: documented current behavior and an unreleased migration record.

- [x] **Step 1: Remove unused/opinionated dependencies**

Remove `@damatjs/logger` and `dotenv` from `packages/core/cli/package.json`, then run:

```bash
bun install
```

Expected: lockfile updates without introducing new dependencies.

- [x] **Step 2: Update living documentation**

Document injected runtime, returned exit results, opt-in presentation, invocation-local state, embedding example, and Damat adapter ownership as current behavior only.

- [x] **Step 3: Add unreleased notes**

`releases/cli/next.md` must explain the breaking move from implicit Damat logger/process termination/global state to runtime injection/result returns, including an exact before/after executable example.

- [x] **Step 4: Run the full Phase 1 verification gate**

Run:

```bash
bun test packages/core/cli/src/tests
bun run --cwd=packages/core/cli build
bun run --cwd=packages/core/cli lint
bun test packages/cli/damat/src
bun run --cwd=packages/cli/damat build
bun run --cwd=packages/cli/damat lint
bun run check-types --filter=@damatjs/cli --filter=@damatjs/damat-cli
bun run check:lines:cli
```

Expected: every command exits zero. Record exact pass/fail counts from Bun output.

- [x] **Step 5: Run dependency and opinion audits**

Run:

```bash
rg -n "@damatjs/logger|dotenv|process\.exit|DAMAT_" packages/core/cli
git diff --check -- packages/core/cli packages/cli/damat/src/cli.ts packages/cli/damat/src/runtime.ts packages/cli/damat/src/__tests__/runtime.test.ts releases/cli
git status --short
```

Expected: the first command finds only migration/release documentation where historical comparison is required; the Phase 1-scoped `git diff --check` reports no whitespace errors; status shows only Phase 1 files plus the preserved pre-existing user changes.

- [x] **Step 6: Report the Phase 1 gate and wait for Phase 2 approval**

Report:

- Delivered API and breaking changes.
- All modified/created files.
- Exact test/build/lint/typecheck results.
- Confirmation that unrelated worktree changes were untouched.
- Remaining roadmap phases.

Do not begin Phase 2 until the user explicitly approves it.

---

### Phase 1 review correction: Make project configuration explicitly optional

- [x] Rename the required executable contract from `CliConfig` to
      `CliDefinition`.
- [x] Create a project-config accessor only when `configLoader` is present.
- [x] Allow the shared execution pipeline to run without an accessor and omit
      `ctx.options.config`.
- [x] Add a red/green regression test and rerun the complete Phase 1 gate.
