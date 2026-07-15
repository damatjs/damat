# CLI Capability Packages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the Damat command implementation into independently testable
CLI capability packages while leaving `@damatjs/damat-cli` as the executable
composer.

**Architecture:** `@damatjs/cli` defines a small `CliCapability` contract and a
standalone test harness. Damat-specific process helpers live in
`@damatjs/cli-support`; app, kit, module, and codegen packages depend only on
their declared libraries and export one capability. The executable composes the
four capabilities in the existing command order.

**Tech Stack:** Bun, TypeScript ESM, CAC through `@damatjs/cli`, Turborepo.

## Global Constraints

- Preserve unrelated staged and unstaged user changes.
- Use Bun only and add no third-party dependencies.
- Keep every created, moved, or touched code/test/script/generated file at or
  below 100 physical lines.
- Use a failing focused test before every behavior or public API change.
- Preserve command names, aliases, options, help order, handlers, and output.
- Do not bump package versions; record changes in `releases/*/next.md`.
- Do not start Phase 3 installer work.
- Do not stage or commit unless the user explicitly requests it.

---

### Task 1: Capability contract, test harness, and support package

**Files:**

- Create: `packages/core/cli/src/types/capability.ts`
- Create: `packages/core/cli/src/capability/defineCliCapability.ts`
- Create: `packages/core/cli/src/capability/composeCliCapabilities.ts`
- Create: `packages/core/cli/src/capability/index.ts`
- Create: `packages/core/cli/src/testing/createCapabilityTestRuntime.ts`
- Create: `packages/core/cli/src/testing/runCapabilityTest.ts`
- Create: `packages/core/cli/src/testing/index.ts`
- Modify: `packages/core/cli/src/index.ts`
- Modify: `packages/core/cli/src/types/index.ts`
- Modify: `packages/core/cli/package.json`
- Test: `packages/core/cli/src/tests/capability.test.ts`
- Test: `packages/core/cli/src/tests/capabilityHarness.test.ts`
- Create: `packages/cli/support/package.json`
- Create: `packages/cli/support/tsconfig.json`
- Create: `packages/cli/support/bunfig.toml`
- Move: `packages/cli/damat/src/command/shared/*` to
  `packages/cli/support/src/`
- Move support tests from the Damat command test directory.
- Create: `packages/cli/support/src/packages/*`
- Create: `packages/cli/support/src/index.ts`
- Create focused support-helper tests under `packages/cli/support/src/tests/`.
- Create living docs and `releases/cli-support/{README.md,next.md}`.

**Interfaces:**

```ts
export interface CliCapability {
  name: string;
  commands: readonly Command[];
}

export function defineCliCapability<const T extends CliCapability>(
  capability: T,
): T;

export function composeCliCapabilities(
  capabilities: readonly CliCapability[],
): Command[];

export async function runCapabilityTest(
  capability: CliCapability,
  args?: readonly string[],
): Promise<CapabilityTestRun>;
```

`@damatjs/cli-support` exports `cleanupTempFile`, `gitAvailable`, `requireGit`,
`runTypeCheck`, `invalidPackageSpecs`, and `installPackages`. Logger parameters
use `CliLogger`, never `@damatjs/logger`.

- [x] **Step 1: Write contract and harness tests**

Assert identity-preserving definition, ordered command composition, and a help
run whose output is captured without reading process state.

- [x] **Step 2: Run the focused tests and observe missing exports**

```bash
bun test packages/core/cli/src/tests/capability.test.ts packages/core/cli/src/tests/capabilityHarness.test.ts
```

- [x] **Step 3: Implement the contract and harness**

The harness builds a test definition named `<capability.name>-test`, uses an
in-memory structural logger/output, and calls `runCli`.

- [x] **Step 4: Extract support helpers and package-install safety helpers**

Rename `installModulePackages` to generic `installPackages`; retain a temporary
named alias inside `cli-module` only where migration makes that useful.

- [x] **Step 5: Verify Task 1**

```bash
bun run --cwd=packages/core/cli build
bun test packages/core/cli/src/tests
bun run --cwd=packages/cli/support build
bun test packages/cli/support/src
bun run --cwd=packages/cli/support lint
bun scripts/check-code-lines.ts packages/core/cli/src packages/cli/support
```

---

### Task 2: Extract the app lifecycle capability

**Files:**

- Create: `packages/cli/app/{package.json,tsconfig.json,bunfig.toml,README.md}`
- Create: `packages/cli/app/docs/README.md`
- Move app sources: `build`, `clone`, `create`, `dev`, and `start` from the
  Damat command directory into `packages/cli/app/src/commands/`.
- Create: `packages/cli/app/src/capability.ts`
- Create: `packages/cli/app/src/index.ts`
- Move app, create-template, and registration tests into
  `packages/cli/app/src/tests/`.
- Create: `releases/cli-app/{README.md,next.md}`.

**Interfaces:**

```ts
export const appCommands: readonly Command[];
export const appCliCapability: CliCapability;
```

The command order is `create`, `clone`, `dev`, `start`, `build`.

**Required decomposition:**

- `build.ts` -> `build/command.ts`, `build/handler.ts`, `build/copySource.ts`.
- `clone/clone.ts` -> `clone/command.ts`, `clone/handler.ts`,
  `clone/options.ts`.
- `create/index.ts` -> `create/command.ts`, `create/handler.ts`,
  `create/runSetup.ts`.
- `create/scaffold/templates/misc.ts` -> named secret and miscellaneous
  template files.
- Oversized tests -> one file per existing validation, execution,
  environment, scaffold, failure, and registration behavior group.

- [x] **Step 1: Write the standalone capability test**

Run `appCliCapability` through `runCapabilityTest(..., ["--help"])` and assert
the five command names appear in the existing order.

- [x] **Step 2: Run it and observe the missing package**

```bash
bun test packages/cli/app/src/tests/capability.test.ts
```

- [x] **Step 3: Move and decompose app sources and tests**

Update shared-helper imports to `@damatjs/cli-support`; preserve every command
object and handler result.

- [x] **Step 4: Verify app behavior**

```bash
bun run --cwd=packages/cli/app build
bun test packages/cli/app/src
bun run --cwd=packages/cli/app lint
bun run --cwd=packages/cli/app check-types
bun scripts/check-code-lines.ts packages/cli/app
```

---

### Task 3: Extract the kit capability

**Files:**

- Create: `packages/cli/kit/{package.json,tsconfig.json,bunfig.toml,README.md}`
- Create: `packages/cli/kit/docs/README.md`
- Move kit sources to `packages/cli/kit/src/commands/kit/`.
- Create: `packages/cli/kit/src/capability.ts`
- Create: `packages/cli/kit/src/index.ts`
- Split and move kit tests into `packages/cli/kit/src/tests/`.
- Create: `releases/cli-kit/{README.md,next.md}`.

**Interfaces:**

```ts
export const kitCommands: readonly Command[];
export const kitCliCapability: CliCapability;
```

**Required decomposition:**

- `add.ts` -> `add/command.ts`, `add/handler.ts`, `add/copyPlanned.ts`,
  `add/recordInstalledKit.ts`.
- `manifest.ts` -> `manifest/types.ts`, `manifest/validate.ts`,
  `manifest/read.ts`.
- `plan.ts` -> `plan/glob.ts`, `plan/buildKitPlan.ts`.
- `kit.test.ts` -> manifest, glob, planning, source, add-plan, add-write,
  init, validate, and capability suites, each below 100 lines.

- [x] **Step 1: Write and fail the standalone kit capability test**
- [x] **Step 2: Move/decompose implementation and point package installation
      at `@damatjs/cli-support`**
- [x] **Step 3: Run the complete kit gate**

```bash
bun run --cwd=packages/cli/kit build
bun test packages/cli/kit/src
bun run --cwd=packages/cli/kit lint
bun run --cwd=packages/cli/kit check-types
bun scripts/check-code-lines.ts packages/cli/kit
```

---

### Task 4: Extract the module capability

**Files:**

- Create:
  `packages/cli/module/{package.json,tsconfig.json,bunfig.toml,README.md}`
- Create: `packages/cli/module/docs/README.md`
- Move module and auth command sources into
  `packages/cli/module/src/commands/`.
- Move `embedAgents.ts` and `verify-link-split.ts` into the module package.
- Create: `packages/cli/module/src/capability.ts`
- Create: `packages/cli/module/src/index.ts`
- Split/move module, auth, migration, scaffold, and helper tests.
- Create: `releases/cli-module/{README.md,next.md}`.

**Interfaces:**

```ts
export const moduleCommands: readonly Command[];
export const moduleCliCapability: CliCapability;
export const authCliCapability: CliCapability;
```

The package exports separate top-level `module` and `auth` capabilities so the
composer can preserve help order. Auth remains in this package because its
current `init` implementation scaffolds and registers a Damat module;
provider-lifecycle redesign belongs to Phase 9.

**Required production decomposition:**

- Split `auth/init.ts` into command, handler, and scaffold writer.
- Split module `add`, `remove`, `update`, and `publish` into command metadata,
  handlers, and named planning/diff/network helpers.
- Split config helpers into register, read, remove, parsing, and serialization.
- Split copy helpers into layout, install, remove, and link installation.
- Split source resolution, init, and list into named units.
- Update logger types to `CliLogger` and shared imports to
  `@damatjs/cli-support`.

**Required test decomposition:**

- Replace each oversized suite with files matching its existing `describe`
  groups.
- Split the shared test setup into `tests/setup/{state,fs,spawn,module,index}.ts`.
- Keep all existing assertions and mock behavior; do not reduce coverage.

- [x] **Step 1: Write and fail the standalone module capability test**
- [x] **Step 2: Move/decompose module production sources**
- [x] **Step 3: Move/decompose module tests and embedded scaffold scripts**
- [x] **Step 4: Run the complete module gate**

```bash
bun run --cwd=packages/cli/module build
bun test packages/cli/module/src
bun run --cwd=packages/cli/module lint
bun run --cwd=packages/cli/module check-types
bun scripts/check-code-lines.ts packages/cli/module
```

---

### Task 5: Extract the codegen capability

**Files:**

- Create:
  `packages/cli/codegen/{package.json,tsconfig.json,bunfig.toml,README.md}`
- Create: `packages/cli/codegen/docs/README.md`
- Move codegen and barrel command sources into
  `packages/cli/codegen/src/commands/`.
- Create: `packages/cli/codegen/src/capability.ts`
- Create: `packages/cli/codegen/src/index.ts`
- Split/move codegen and link-augmentation tests.
- Create: `releases/cli-codegen/{README.md,next.md}`.

**Interfaces:**

```ts
export const codegenCommands: readonly Command[];
export const codegenCliCapability: CliCapability;
```

The command order is `codegen`, `barrel`.

**Required decomposition:**

- Split `augmentWithLinks.ts` into link resolution and generated-file
  augmentation.
- Split `runModule.ts` into eligibility and generation units.
- Split codegen tests into command routing, generation modes, errors, barrel,
  link resolution, and link file augmentation suites.

- [x] **Step 1: Write and fail the standalone codegen capability test**
- [x] **Step 2: Move/decompose codegen implementation and tests**
- [x] **Step 3: Run the complete codegen gate**

```bash
bun run --cwd=packages/cli/codegen build
bun test packages/cli/codegen/src
bun run --cwd=packages/cli/codegen lint
bun run --cwd=packages/cli/codegen check-types
bun scripts/check-code-lines.ts packages/cli/codegen
```

---

### Task 6: Thin Damat composer, compatibility, docs, and Phase 2 gate

**Files:**

- Modify: `packages/cli/damat/src/cli.ts`
- Create: `packages/cli/damat/src/capabilities.ts`
- Modify: `packages/cli/damat/src/index.ts`
- Modify: `packages/cli/damat/package.json`
- Remove the old `packages/cli/damat/src/command/` tree after every file has
  moved.
- Replace Damat command tests with composition/order/help compatibility tests.
- Rewrite Damat living docs as composer documentation.
- Create: `releases/damat-cli/next.md`
- Modify: `releases/damat-cli/README.md`
- Modify: `releases/README.md`
- Modify root line-check scripts to include every capability package.

**Composer:**

```ts
export const damatCapabilities = [
  appCliCapability,
  codegenCliCapability,
  moduleCliCapability,
  kitCliCapability,
  authCliCapability,
] as const;

export const damatCommands = composeCliCapabilities(damatCapabilities);
```

The actual command order must remain `create`, `clone`, `dev`, `start`,
`build`, `codegen`, `barrel`, `module`, `kit`, `auth`; arrange capability
composition or explicit command selection to preserve it exactly.

- [x] **Step 1: Write a failing composer compatibility test**

Assert the exact top-level command order, aliases/options for representative
commands, and composed help output.

- [x] **Step 2: Reduce the executable package**

Keep only capability composition, runtime adapter, embedded version, banner,
fatal error policy, and public core re-export.

- [x] **Step 3: Update docs and unreleased notes**

Each new package gets current-behavior living docs and an Unreleased release
record. Damat docs link to package ownership instead of describing internal
handlers as local files.

- [x] **Step 4: Install workspace metadata and run the Phase 2 gate**

```bash
bun install
bun run build --filter=@damatjs/cli --filter=@damatjs/cli-support --filter=@damatjs/cli-app --filter=@damatjs/cli-kit --filter=@damatjs/cli-module --filter=@damatjs/cli-codegen --filter=@damatjs/damat-cli
bun run test --filter=@damatjs/cli --filter=@damatjs/cli-support --filter=@damatjs/cli-app --filter=@damatjs/cli-kit --filter=@damatjs/cli-module --filter=@damatjs/cli-codegen --filter=@damatjs/damat-cli
bun run lint --filter=@damatjs/cli --filter=@damatjs/cli-support --filter=@damatjs/cli-app --filter=@damatjs/cli-kit --filter=@damatjs/cli-module --filter=@damatjs/cli-codegen --filter=@damatjs/damat-cli
bun run check-types --filter=@damatjs/cli --filter=@damatjs/cli-support --filter=@damatjs/cli-app --filter=@damatjs/cli-kit --filter=@damatjs/cli-module --filter=@damatjs/cli-codegen --filter=@damatjs/damat-cli
bun run check:lines:cli
```

- [x] **Step 5: Audit package boundaries**

Confirm the Damat composer has no framework/module/codegen/link/load-env
dependencies and no command-handler sources. Confirm every capability runs
through the standalone harness and no code file exceeds 100 lines.

- [x] **Step 6: Report Phase 2 and wait for Phase 3 approval**

Do not commit and do not begin the generic installer engine.
