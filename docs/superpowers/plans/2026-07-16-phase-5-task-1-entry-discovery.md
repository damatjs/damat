# Phase 5 Task 1 Entry Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make module entry metadata optional while preserving every existing
`src/module.json` module and making new root `damat.json` scaffolds resolve
`src/index.ts` conventionally.

**Architecture:** Add one focused entry-discovery helper to `@damatjs/module`.
Standalone runtime and registry readiness consume that helper, while source and
package artifact resolution remain Phase 5 Task 2. New scaffolds omit redundant
entry metadata and generated contract tests validate the artifact root.

**Tech Stack:** Bun, TypeScript ESM, `node:fs`, `node:path`, Bun test.

**Status:** Implemented and verified

## Global Constraints

- Complete only Phase 5 Task 1, then report and wait for approval.
- Preserve legacy `src/module.json` with `"entry": "./index.ts"`.
- Keep `damat.json` as the only new Damat contract.
- Do not use or require `package.json.exports`.
- Source mode remains the stable v1 path; package mode remains early alpha.
- Use Bun commands only.
- Add no dependencies.
- Keep every code, test, fixture, script, and generated file at 100 physical
  lines or fewer.
- Do not create a checkpoint commit until the user explicitly requests it.

---

### Task 1: Add convention-first entry discovery

**Files:**

- Create: `packages/module/src/manifest/entry.ts`
- Modify: `packages/module/src/manifest/index.ts`
- Create: `packages/module/tests/entry-discovery.test.ts`

**Interfaces:**

- Produces:
  `resolveModuleEntry(moduleDir: string, manifest: ModuleManifest): string`.
- The result is an existing absolute entry path.
- A declared `paths.entry` is checked first.
- Without an override, candidates are `index.ts`, `index.js`, `src/index.ts`,
  and `src/index.js`, in that order.

- [ ] **Step 1: Write failing discovery tests**

Cover a sibling `index.ts`, root-manifest `src/index.ts`, an explicit compiled
entry override, and a missing-entry error:

```ts
expect(resolveModuleEntry(root, { name: "billing" })).toBe(
  join(root, "src/index.ts"),
);
expect(
  resolveModuleEntry(src, {
    name: "patient",
    paths: { entry: "./index.ts" },
  }),
).toBe(join(src, "index.ts"));
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
bun test packages/module/tests/entry-discovery.test.ts
```

Expected: failure because `resolveModuleEntry` is not exported.

- [ ] **Step 3: Implement the minimal helper**

Use `existsSync` and `join`; return the first existing candidate. When no
candidate exists, throw an error that identifies the declared entry or lists
the conventional candidates and states that the entry must default-export
`defineModule(...)`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the same Bun test command. Expected: all entry-discovery tests pass.

### Task 2: Use the resolved entry in runtime and readiness

**Files:**

- Modify: `packages/module/src/runtime/appConfig.ts`
- Modify: `packages/module/src/runtime/start.ts`
- Modify: `packages/module/src/registry/readiness.ts`
- Create: `packages/module/tests/entry-readiness.test.ts`

**Interfaces:**

- `BuildModuleAppConfigInput` gains optional `entry?: string`.
- `startModuleApp` resolves the concrete entry and passes it to
  `buildModuleAppConfig`.
- `validateModuleDir` reports `resolveModuleEntry` failures as validation
  errors.

- [ ] **Step 1: Write failing integration tests**

Create a root `damat.json` fixture with `src/index.ts` and no entry field, then
assert readiness succeeds. Create a legacy `src/module.json` fixture with
`"./index.ts"` and assert it also succeeds. Assert app config uses the supplied
resolved entry rather than the module directory.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
bun test packages/module/tests/entry-readiness.test.ts
```

Expected: root `damat.json` readiness fails because it currently checks
`<root>/index.ts`.

- [ ] **Step 3: Integrate the helper**

Resolve the entry once in `startModuleApp`. Keep `buildModuleAppConfig` pure by
accepting the resolved path. Replace readiness's duplicated default-entry check
with a caught `resolveModuleEntry` call.

- [ ] **Step 4: Run focused and existing module tests**

Run:

```bash
bun test packages/module/tests/entry-discovery.test.ts \
  packages/module/tests/entry-readiness.test.ts \
  packages/module/tests/manifest.test.ts \
  packages/module/tests/damat-manifest.test.ts
```

Expected: all tests pass.

### Task 3: Make new scaffolds convention-first

**Files:**

- Modify:
  `packages/cli/module/src/commands/module/scaffold/templates/manifest.ts`
- Modify:
  `packages/cli/module/src/commands/module/scaffold/templates/contractTest.ts`
- Modify:
  `packages/cli/module/src/commands/auth/scaffold/manifest.ts`
- Modify:
  `packages/cli/module/src/tests/templates/01-scaffold-templates-file-builders-02.test.ts`
- Modify:
  `packages/cli/module/src/tests/templates/01-scaffold-templates-file-builders-06.test.ts`
- Modify:
  `packages/cli/module/src/tests/authInit/02-damat-auth-init-better-auth-scaffold-00.test.ts`

**Interfaces:**

- New standalone module manifests omit `module.entry`.
- Auth storage manifests omit the redundant sibling entry.
- Generated contract tests call `validateModuleDir` on the package root.

- [ ] **Step 1: Add failing scaffold assertions**

Assert `json.module.entry` is absent and the generated contract test contains
`join(import.meta.dir, "../")` rather than `../src`. Assert the auth manifest
written by the scaffold also omits `entry`.

- [ ] **Step 2: Run scaffold tests and verify RED**

Run:

```bash
bun test packages/cli/module/src/tests/templates \
  packages/cli/module/src/tests/authInit/02-damat-auth-init-better-auth-scaffold-00.test.ts
```

Expected: assertions fail because both scaffolds currently write `entry`.

- [ ] **Step 3: Remove redundant entry fields and fix the contract root**

Delete only the two scaffolded entry properties. Keep the generated
`src/index.ts` files unchanged.

- [ ] **Step 4: Run the scaffold tests and verify GREEN**

Run the same Bun test command. Expected: all selected scaffold tests pass.

### Task 4: Synchronize living docs, roadmap, and release notes

**Files:**

- Modify: `packages/module/MODULES.md`
- Modify: `packages/module/README.md`
- Modify: `packages/module/docs/README.md`
- Modify: `packages/module/docs/manifest.md`
- Modify: `packages/module/docs/runtime.md`
- Modify: `packages/module/docs/registry.md`
- Modify: `packages/cli/module/README.md`
- Modify: `docs/guide/13-authoring-modules.md`
- Modify: `docs/superpowers/plans/2026-07-15-damat-v1-roadmap.md`
- Modify:
  `docs/superpowers/specs/2026-07-16-damat-install-profiles-design.md`
- Modify: `releases/module/next.md`
- Modify: `releases/cli-module/next.md`

**Interfaces:**

- Living docs describe entry as convention-first with an optional override.
- The roadmap no longer requires `package.json.exports`.
- Release notes describe the behavior change and required action.

- [ ] **Step 1: Replace required-entry examples and wording**

Remove `"entry": "./src/index.ts"` from new root-manifest examples. Document
that legacy manifest paths remain relative to their manifest directory and that
non-standard layouts may declare an override.

- [ ] **Step 2: Update unreleased notes**

Record that new scaffolds omit redundant entry metadata, existing
`src/module.json` packages remain compatible, and custom layouts should keep an
explicit entry.

- [ ] **Step 3: Run documentation consistency searches**

Run:

```bash
! rg -n '"entry": "./src/index.ts"|missing entry is an error|required entry' \
  packages/module packages/cli/module docs/guide/13-authoring-modules.md
```

Expected: no stale required-entry statements or root entry examples.

### Task 5: Task-level verification

**Files:** No new files.

- [ ] **Step 1: Run package tests**

```bash
bun test packages/module
bun test packages/cli/module
```

- [ ] **Step 2: Run type checks and builds**

```bash
bun run --cwd packages/module build
bun run --cwd packages/cli/module check-types
bun run --cwd packages/cli/module build
```

- [ ] **Step 3: Run lint**

```bash
bun run --cwd packages/module lint
bun run --cwd packages/cli/module lint
```

- [ ] **Step 4: Run the repository line-count checker**

Use the repository's existing checker and confirm every new or touched code,
test, fixture, script, and generated file is at most 100 physical lines.

- [ ] **Step 5: Review the diff and report the approval gate**

Report behavior delivered, files changed, exact verification results, and known
Phase 5 Task 2 follow-up. Do not commit or start Task 2 without user approval.
