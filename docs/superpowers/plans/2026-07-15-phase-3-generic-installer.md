# Generic Installer Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@damatjs/installer`, a headless transactional engine that
installs, updates, and removes artifacts from every approved origin in source or
package mode while preserving immutable provenance and modified user work.

**Architecture:** Origin adapters acquire artifacts into a normalized local
form; integrity finalization produces immutable provenance; recipe planning
emits serializable typed operations; and a lean journaled executor mutates only
installer-owned targets. `damat.lock.json` records checksums and ownership,
while confirmed removal stores backups only for modified owned files.

**Tech Stack:** Bun, TypeScript ESM, Node built-ins, Turborepo. No new runtime
third-party dependency.

## Global Constraints

- Work on the existing `expansion` feature branch; do not create another branch
  or worktree unless the user changes direction.
- Preserve the unrelated staged `.github/workflows/test.yml` and `AGENTS.md`
  changes; do not stage, commit, restore, or edit them.
- Use Bun only inside the repository.
- Use TDD for every behavior change: focused RED, minimal GREEN, refactor, then
  focused and package regression tests.
- Keep every created or touched code, test, fixture, script, and generated file
  at or below 100 physical lines.
- Use `apply_patch` for source and documentation edits.
- Do not add executable remote hooks or lifecycle callbacks.
- Origin and installation mode stay independent. Mode precedence is caller
  override, recipe default, then `source`.
- Never silently change an explicitly requested mode.
- Exact transaction rollback covers only managed project files,
  `package.json`, package-manager lockfiles, and `damat.lock.json`.
- `node_modules` reconciliation is best-effort and must be reported.
- Removal backups are created only for confirmed modified owned files.
- Do not migrate Kit or Module commands; that belongs to Phase 4.
- Do not bump existing package versions. The new package starts at the current
  workspace development line, `0.6.0`, and uses `releases/installer/next.md`.
- Do not commit automatically. After each numbered task, report files,
  behavior, tests, and follow-up work, then wait for explicit approval.

---

### Task 1: Package skeleton and runtime-validated schemas

**Files:**

- Create: `packages/installer/package.json`
- Create: `packages/installer/tsconfig.json`
- Create: `packages/installer/bunfig.toml`
- Create: `packages/installer/src/types/origin.ts`
- Create: `packages/installer/src/types/recipe.ts`
- Create: `packages/installer/src/types/plan.ts`
- Create: `packages/installer/src/types/lockfile.ts`
- Create: `packages/installer/src/types/runtime.ts`
- Create: `packages/installer/src/types/security.ts`
- Create: `packages/installer/src/types/index.ts`
- Create: `packages/installer/src/schema/assert.ts`
- Create: `packages/installer/src/schema/origin.ts`
- Create: `packages/installer/src/schema/recipe.ts`
- Create: `packages/installer/src/schema/lockfile.ts`
- Create: `packages/installer/src/schema/index.ts`
- Create: `packages/installer/src/index.ts`
- Test: `packages/installer/src/tests/schema/origin.test.ts`
- Test: `packages/installer/src/tests/schema/recipe.test.ts`
- Test: `packages/installer/src/tests/schema/lockfile.test.ts`
- Create: `packages/installer/README.md`
- Create: `packages/installer/docs/README.md`
- Create: `releases/installer/README.md`
- Create: `releases/installer/next.md`
- Modify: `releases/README.md`

**Interfaces:**

```ts
export type InstallMode = "source" | "package";

export type OriginRequest =
  | { type: "local"; path: string }
  | { type: "git"; url: string; ref?: string; subdir?: string }
  | { type: "registry"; ref: string }
  | { type: "npm"; name: string; version?: string; registryUrl?: string }
  | { type: "tarball"; url: string; integrity?: string };

export interface InstallRecipe {
  schemaVersion: 1;
  id: string;
  kind: string;
  version?: string;
  install?: { modes: InstallMode[]; default?: InstallMode };
  mappings?: Array<{ from: string; to: string }>;
  ignore?: string[];
  package?: { name: string; ref?: string };
  packages?: Record<string, string>;
  usageHints?: Array<{ token: string; targets?: string[] }>;
}

export function parseOriginRequest(input: unknown): OriginRequest;
export function parseInstallRecipe(input: unknown): InstallRecipe;
export function parseInstallerLock(input: unknown): InstallerLock;
```

- [x] **Step 1: Write failing origin-schema tests**

Cover all five discriminants, optional Git/npm/tarball fields, empty required
strings, unsafe Git subdirectories, and unknown origin types. The first test
imports `parseOriginRequest` from the package entry and expects a valid local
request to round-trip.

- [x] **Step 2: Run the origin test and verify RED**

```bash
bun test packages/installer/src/tests/schema/origin.test.ts
```

Expected: fail because `@damatjs/installer` schema exports do not exist.

- [x] **Step 3: Implement origin types and validation**

Use small assertion helpers (`assertRecord`, `requiredString`,
`optionalString`, `rejectUnknownKeys`) and return a newly normalized object.
Reject absolute or parent-traversing `subdir` values.

- [x] **Step 4: Run origin tests and verify GREEN**

Run the Step 2 command. Expected: all origin-schema cases pass.

- [x] **Step 5: Write failing recipe and lockfile tests**

Recipe tests cover mode/default consistency, kebab-case installation IDs, safe
mapping targets, literal non-empty usage hints, package maps, and rejection of
`hooks`, `scripts`, `commands`, functions, and unknown remote-execution fields.
Lockfile tests cover schema version, installation records, owned checksums,
package ownership, immutable provenance, and malformed JSON-shaped values.

- [x] **Step 6: Run the new schema suites and verify RED**

```bash
bun test packages/installer/src/tests/schema
```

Expected: recipe/lockfile tests fail on missing parsers while origin tests stay
green.

- [x] **Step 7: Implement recipe, plan, security, runtime, and lockfile types**

Define serializable plan operations as a discriminated union:

```ts
export type InstallerOperation =
  | { type: "write-file"; source: string; target: string; checksum: string }
  | { type: "remove-file"; target: string; installedChecksum: string }
  | { type: "add-package"; name: string; reference: string }
  | { type: "remove-package"; name: string; reference: string }
  | { type: "backup-file"; target: string; currentChecksum: string };
```

Define `InstallerLock` with `schemaVersion: 1` and installation records holding
mode, provenance, artifact/recipe integrity, verification, owned files, owned
packages, and usage hints. Implement the parsers without process-global state.

- [x] **Step 8: Add package metadata, living docs, and unreleased notes**

The README documents only the schema/API behavior delivered in this task. The
release note identifies this as an unreleased new package and links its current
docs. Add Installer to the repository release index.

- [x] **Step 9: Run the Task 1 gate**

```bash
bun install
bun test packages/installer/src/tests/schema
bun run --cwd packages/installer build
bun run --cwd packages/installer lint
bun run --cwd packages/installer check-types
bun scripts/check-code-lines.ts packages/installer
git diff --check -- packages/installer releases/installer releases/README.md bun.lock
```

Report Task 1 and wait for approval.

---

### Task 2: Artifact acquisition adapters

**Files:**

- Create: `packages/installer/src/origin/types.ts`
- Create: `packages/installer/src/origin/local.ts`
- Create: `packages/installer/src/origin/git/parse.ts`
- Create: `packages/installer/src/origin/git/acquire.ts`
- Create: `packages/installer/src/origin/git/index.ts`
- Create: `packages/installer/src/origin/registry.ts`
- Create: `packages/installer/src/origin/npm/parse.ts`
- Create: `packages/installer/src/origin/npm/metadata.ts`
- Create: `packages/installer/src/origin/npm/acquire.ts`
- Create: `packages/installer/src/origin/npm/index.ts`
- Create: `packages/installer/src/origin/tarball/header.ts`
- Create: `packages/installer/src/origin/tarball/safety.ts`
- Create: `packages/installer/src/origin/tarball/extract.ts`
- Create: `packages/installer/src/origin/tarball/acquire.ts`
- Create: `packages/installer/src/origin/tarball/index.ts`
- Create: `packages/installer/src/origin/acquire.ts`
- Create: `packages/installer/src/origin/index.ts`
- Test: `packages/installer/src/tests/origin/local.test.ts`
- Test: `packages/installer/src/tests/origin/git.test.ts`
- Test: `packages/installer/src/tests/origin/registry.test.ts`
- Test: `packages/installer/src/tests/origin/npm.test.ts`
- Test: `packages/installer/src/tests/origin/tarball.test.ts`
- Create: `packages/installer/src/tests/fixtures/archive.ts`
- Create: `packages/installer/src/tests/fixtures/runtime.ts`
- Modify: `packages/installer/docs/README.md`
- Modify: `releases/installer/next.md`

**Interfaces:**

```ts
export interface AcquiredArtifact {
  request: OriginRequest;
  rootDir: string;
  cleanup(): void;
  expectedIntegrity?: string;
  packageReference?: string;
  metadata: Record<string, string>;
}

export interface RegistryDescriptor {
  origin: OriginRequest;
  owner?: string;
  verification?: VerificationStatus;
  integrity?: string;
  packageReference?: string;
}

export async function acquireArtifact(
  request: OriginRequest,
  ports: AcquisitionPorts,
): Promise<AcquiredArtifact>;
```

- [ ] **Step 1: Write failing local and Git acquisition tests**

Use real temporary directories for local inputs and an injected command runner
for Git. Assert safe subdirectory selection, checkout cleanup, exact command
arguments, missing Git errors, failed-clone cleanup, and traversal rejection.

- [ ] **Step 2: Verify local/Git RED**

```bash
bun test packages/installer/src/tests/origin/local.test.ts packages/installer/src/tests/origin/git.test.ts
```

Expected: fail on missing acquisition exports.

- [ ] **Step 3: Implement local and Git acquisition**

Local acquisition resolves files/directories without copying. Git acquisition
uses the injected runner, clones into a generated temporary directory, selects
only a safe subdirectory, and returns idempotent cleanup.

- [ ] **Step 4: Verify local/Git GREEN**

Run the Step 2 command and confirm all cases pass.

- [ ] **Step 5: Write failing safe-tarball tests**

Build minimal tar/tgz buffers in the fixture helper. Cover regular files,
directories, gzip, remote fetch, local archives, truncated headers, absolute
paths, `..`, escaping links, device entries, and cleanup on extraction failure.

- [ ] **Step 6: Verify tarball RED, implement safe extraction, verify GREEN**

```bash
bun test packages/installer/src/tests/origin/tarball.test.ts
```

Implement POSIX tar header parsing and gzip detection with Node built-ins.
Accept only regular files and directories; validate every normalized path before
writing. Re-run until all tarball tests pass.

- [ ] **Step 7: Write failing registry and npm acquisition tests**

Registry tests prove the injected descriptor is preserved and recursively
acquired without importing a Damat registry package. npm tests use injected
metadata/fetch fixtures to select an exact version, obtain its tarball and
integrity, extract the `package/` root, and reject unknown ranges or malformed
metadata.

- [ ] **Step 8: Verify registry/npm RED, implement adapters, verify GREEN**

```bash
bun test packages/installer/src/tests/origin/registry.test.ts packages/installer/src/tests/origin/npm.test.ts
```

Implement registry recursion with a visited-reference cycle guard. Implement
npm exact versions and dist-tags only; record the selected exact version in
metadata and use the tarball adapter for bytes.

- [ ] **Step 9: Run the Task 2 gate**

```bash
bun test packages/installer/src/tests/origin
bun run --cwd packages/installer build
bun run --cwd packages/installer lint
bun run --cwd packages/installer check-types
bun scripts/check-code-lines.ts packages/installer
git diff --check -- packages/installer releases/installer
```

Update current docs/release notes, report Task 2, and wait for approval.

---

### Task 3: Immutable identity and canonical integrity

**Files:**

- Create: `packages/installer/src/integrity/bytes.ts`
- Create: `packages/installer/src/integrity/file.ts`
- Create: `packages/installer/src/integrity/tree/entries.ts`
- Create: `packages/installer/src/integrity/tree/serialize.ts`
- Create: `packages/installer/src/integrity/tree/hash.ts`
- Create: `packages/installer/src/integrity/tree/index.ts`
- Create: `packages/installer/src/integrity/verify.ts`
- Create: `packages/installer/src/integrity/index.ts`
- Create: `packages/installer/src/origin/finalize/git.ts`
- Create: `packages/installer/src/origin/finalize/npm.ts`
- Create: `packages/installer/src/origin/finalize/provenance.ts`
- Create: `packages/installer/src/origin/finalize/index.ts`
- Create: `packages/installer/src/origin/resolve.ts`
- Test: `packages/installer/src/tests/integrity/bytes.test.ts`
- Test: `packages/installer/src/tests/integrity/tree.test.ts`
- Test: `packages/installer/src/tests/integrity/verify.test.ts`
- Test: `packages/installer/src/tests/origin/finalize.test.ts`
- Modify: `packages/installer/docs/README.md`
- Modify: `releases/installer/next.md`

**Interfaces:**

```ts
export interface ResolvedArtifact extends AcquiredArtifact {
  integrity: string;
  immutableIdentity: string;
  provenance: ArtifactProvenance;
  supportedModes: InstallMode[];
}

export function hashBytes(value: Uint8Array): string;
export function hashTree(rootDir: string): string;
export function verifyIntegrity(expected: string, actual: string): void;
export async function resolveArtifact(
  request: OriginRequest,
  ports: AcquisitionPorts,
): Promise<ResolvedArtifact>;
```

- [ ] **Step 1: Write and fail deterministic integrity tests**

Assert standard SHA-256 vectors; tree order independence; path/type/mode/content
sensitivity; ignored VCS/dependency paths; stable empty trees; and expected
integrity match/mismatch behavior.

- [ ] **Step 2: Implement canonical hashing and verify GREEN**

```bash
bun test packages/installer/src/tests/integrity
```

Serialize each sorted entry as type, normalized relative path, normalized mode,
size, and content digest before hashing the complete stream.

- [ ] **Step 3: Write and fail immutable-provenance tests**

Cover Git branch/tag requests resolving through `git rev-parse HEAD`, Git
package references ending in the SHA, npm dist-tags recording exact versions,
registry outer+inner identities, local tree identity, direct tarball identity,
and cleanup when finalization fails.

- [ ] **Step 4: Implement finalization and verify GREEN**

```bash
bun test packages/installer/src/tests/origin/finalize.test.ts
```

Build provenance from request plus acquired metadata, verify any expected
integrity before returning, and derive supported modes from content and immutable
package-reference availability.

- [ ] **Step 5: Run the Task 3 gate**

```bash
bun test packages/installer/src/tests/integrity packages/installer/src/tests/origin
bun run --cwd packages/installer build
bun run --cwd packages/installer lint
bun run --cwd packages/installer check-types
bun scripts/check-code-lines.ts packages/installer
```

Update docs/release notes, report Task 3, and wait for approval.

---

### Task 4: Declarative recipes and operation planning

**Files:**

- Create: `packages/installer/src/recipe/mode.ts`
- Create: `packages/installer/src/recipe/glob/parse.ts`
- Create: `packages/installer/src/recipe/glob/match.ts`
- Create: `packages/installer/src/recipe/glob/index.ts`
- Create: `packages/installer/src/recipe/files.ts`
- Create: `packages/installer/src/recipe/hash.ts`
- Create: `packages/installer/src/recipe/index.ts`
- Create: `packages/installer/src/plan/files.ts`
- Create: `packages/installer/src/plan/packages.ts`
- Create: `packages/installer/src/plan/create.ts`
- Create: `packages/installer/src/plan/index.ts`
- Test: `packages/installer/src/tests/recipe/mode.test.ts`
- Test: `packages/installer/src/tests/recipe/glob.test.ts`
- Test: `packages/installer/src/tests/recipe/files.test.ts`
- Test: `packages/installer/src/tests/plan/create.test.ts`
- Modify: `packages/installer/README.md`
- Modify: `packages/installer/docs/README.md`
- Modify: `releases/installer/next.md`

**Interfaces:**

```ts
export function selectInstallMode(
  requested: InstallMode | undefined,
  recipe: InstallRecipe,
  supported: readonly InstallMode[],
): InstallMode;

export function createInstallPlan(input: {
  projectDir: string;
  artifact: ResolvedArtifact;
  recipe: InstallRecipe;
  mode?: InstallMode;
  lock: InstallerLock;
}): InstallerPlan;
```

- [ ] **Step 1: Write and fail mode-precedence tests**

Cover override, manifest default, system source default, explicit unsupported
mode, invalid manifest default, and supported-mode intersection.

- [ ] **Step 2: Implement mode selection and verify GREEN**

```bash
bun test packages/installer/src/tests/recipe/mode.test.ts
```

- [ ] **Step 3: Write and fail mapping tests**

Cover `*`, `**`, `?`, first-match mapping, ignore rules, unmatched files,
single-file artifacts, fallback-free behavior, deterministic ordering, target
escape rejection, symlink rejection, and recipe hashing.

- [ ] **Step 4: Implement declarative mapping and verify GREEN**

```bash
bun test packages/installer/src/tests/recipe
```

Rules remain data-only. No manifest value is invoked as code.

- [ ] **Step 5: Write and fail source/package plan tests**

Source plans emit checksum-bearing `write-file` operations. Package plans emit
one immutable `add-package` operation plus declared safe supporting packages.
Both include artifact/recipe integrity, provenance, warnings, and dry-run-safe
serializable output.

- [ ] **Step 6: Implement the minimal planner and verify GREEN**

```bash
bun test packages/installer/src/tests/plan/create.test.ts
```

- [ ] **Step 7: Run the Task 4 gate**

```bash
bun test packages/installer/src/tests/recipe packages/installer/src/tests/plan
bun run --cwd packages/installer build
bun run --cwd packages/installer lint
bun run --cwd packages/installer check-types
bun scripts/check-code-lines.ts packages/installer
```

Update living docs/release notes, report Task 4, and wait for approval.

---

### Task 5: Ownership, collisions, lockfile IO, and lean journals

**Files:**

- Create: `packages/installer/src/lockfile/path.ts`
- Create: `packages/installer/src/lockfile/read.ts`
- Create: `packages/installer/src/lockfile/write.ts`
- Create: `packages/installer/src/lockfile/index.ts`
- Create: `packages/installer/src/plan/ownership.ts`
- Create: `packages/installer/src/plan/collisions.ts`
- Create: `packages/installer/src/plan/modified.ts`
- Create: `packages/installer/src/transaction/types.ts`
- Create: `packages/installer/src/transaction/path.ts`
- Create: `packages/installer/src/transaction/marker.ts`
- Create: `packages/installer/src/transaction/journal/read.ts`
- Create: `packages/installer/src/transaction/journal/write.ts`
- Create: `packages/installer/src/transaction/journal/inverse.ts`
- Create: `packages/installer/src/transaction/journal/index.ts`
- Create: `packages/installer/src/transaction/index.ts`
- Test: `packages/installer/src/tests/lockfile/io.test.ts`
- Test: `packages/installer/src/tests/plan/ownership.test.ts`
- Test: `packages/installer/src/tests/plan/collisions.test.ts`
- Test: `packages/installer/src/tests/transaction/journal.test.ts`
- Test: `packages/installer/src/tests/transaction/marker.test.ts`
- Modify: `packages/installer/docs/README.md`
- Modify: `releases/installer/next.md`

**Interfaces:**

```ts
export function readInstallerLock(projectDir: string): InstallerLock;
export function writeInstallerLock(
  projectDir: string,
  lock: InstallerLock,
): void;
export function analyzeOwnership(
  plan: InstallerPlan,
  lock: InstallerLock,
): OwnershipReport;
export function createJournal(projectDir: string, id: string): JournalWriter;
export function rollbackJournal(projectDir: string, id: string): void;
```

- [ ] **Step 1: Write and fail atomic lockfile IO tests**

Cover missing lock defaults, strict malformed lock rejection, deterministic
JSON, atomic rename, cleanup after failed rename, and preservation of the old
lock on failure.

- [ ] **Step 2: Implement lockfile IO and verify GREEN**

```bash
bun test packages/installer/src/tests/lockfile/io.test.ts
```

- [ ] **Step 3: Write and fail ownership/collision tests**

Cover unowned existing targets, same-installation updates, cross-installation
conflicts, current checksum mismatch, missing owned targets, duplicate plan
targets, package ownership counts, and explicit adoption metadata.

- [ ] **Step 4: Implement plan analysis and verify GREEN**

```bash
bun test packages/installer/src/tests/plan/ownership.test.ts packages/installer/src/tests/plan/collisions.test.ts
```

- [ ] **Step 5: Write and fail marker/journal tests**

Assert exclusive marker creation, active transaction rejection, explicit stale
journal recovery requirement, append-before-mutate ordering, inverse delete for
new files, prior-byte storage only for touched existing files, reverse-order
rollback, and successful journal cleanup.

- [ ] **Step 6: Implement lean journal primitives and verify GREEN**

```bash
bun test packages/installer/src/tests/transaction
```

Journal entries store only inverse data for actual operations. Do not copy
untouched project paths.

- [ ] **Step 7: Run the Task 5 gate**

```bash
bun test packages/installer/src/tests/lockfile packages/installer/src/tests/plan packages/installer/src/tests/transaction
bun run --cwd packages/installer build
bun run --cwd packages/installer lint
bun run --cwd packages/installer check-types
bun scripts/check-code-lines.ts packages/installer
```

Update docs/release notes, report Task 5, and wait for approval.

---

### Task 6: Package-manager target adapters

**Files:**

- Create: `packages/installer/src/package-manager/types.ts`
- Create: `packages/installer/src/package-manager/detect.ts`
- Create: `packages/installer/src/package-manager/shared.ts`
- Create: `packages/installer/src/package-manager/bun.ts`
- Create: `packages/installer/src/package-manager/npm.ts`
- Create: `packages/installer/src/package-manager/pnpm.ts`
- Create: `packages/installer/src/package-manager/yarn.ts`
- Create: `packages/installer/src/package-manager/select.ts`
- Create: `packages/installer/src/package-manager/index.ts`
- Test: `packages/installer/src/tests/package-manager/detect.test.ts`
- Test: `packages/installer/src/tests/package-manager/adapters.test.ts`
- Modify: `packages/installer/docs/README.md`
- Modify: `releases/installer/next.md`

**Interfaces:**

```ts
export type PackageManagerName = "bun" | "npm" | "pnpm" | "yarn";

export interface PackageManagerAdapter {
  name: PackageManagerName;
  touchedFiles(projectDir: string): string[];
  addCommand(
    packages: Record<string, string>,
    allowScripts: boolean,
  ): CommandSpec;
  removeCommand(names: string[], allowScripts: boolean): CommandSpec;
}

export function detectPackageManager(
  projectDir: string,
  explicit?: PackageManagerName,
): PackageManagerName;
```

- [ ] **Step 1: Write and fail target-detection tests**

Cover explicit selection, `packageManager` field, each lockfile, matching field
and lockfile, ambiguous lockfiles, missing signals, and unsupported field values.

- [ ] **Step 2: Implement detection and verify GREEN**

```bash
bun test packages/installer/src/tests/package-manager/detect.test.ts
```

- [ ] **Step 3: Write and fail adapter command tests**

Assert exact add/remove argv, immutable name/reference formatting, no shell
interpolation, default install-script blocking, explicit script allowance, and
the exact manifest/lockfiles each manager may touch.

- [ ] **Step 4: Implement all adapters and verify GREEN**

```bash
bun test packages/installer/src/tests/package-manager/adapters.test.ts
```

Commands are returned as `{ command, args, cwd, env }`; adapters do not execute
processes themselves.

- [ ] **Step 5: Run the Task 6 gate**

```bash
bun test packages/installer/src/tests/package-manager
bun run --cwd packages/installer build
bun run --cwd packages/installer lint
bun run --cwd packages/installer check-types
bun scripts/check-code-lines.ts packages/installer
```

Update docs/release notes, report Task 6, and wait for approval.

---

### Task 7: Add, update, remove, recovery, backups, and usage warnings

**Files:**

- Create: `packages/installer/src/usage/types.ts`
- Create: `packages/installer/src/usage/files.ts`
- Create: `packages/installer/src/usage/scan.ts`
- Create: `packages/installer/src/usage/index.ts`
- Create: `packages/installer/src/backup/path.ts`
- Create: `packages/installer/src/backup/manifest.ts`
- Create: `packages/installer/src/backup/create.ts`
- Create: `packages/installer/src/backup/restore.ts`
- Create: `packages/installer/src/backup/index.ts`
- Create: `packages/installer/src/plan/add.ts`
- Create: `packages/installer/src/plan/update.ts`
- Create: `packages/installer/src/plan/remove.ts`
- Create: `packages/installer/src/transaction/apply/file.ts`
- Create: `packages/installer/src/transaction/apply/package.ts`
- Create: `packages/installer/src/transaction/apply/index.ts`
- Create: `packages/installer/src/transaction/execute.ts`
- Create: `packages/installer/src/transaction/recover.ts`
- Create: `packages/installer/src/operations/add.ts`
- Create: `packages/installer/src/operations/update.ts`
- Create: `packages/installer/src/operations/remove.ts`
- Create: `packages/installer/src/operations/index.ts`
- Test: `packages/installer/src/tests/usage/scan.test.ts`
- Test: `packages/installer/src/tests/backup/remove.test.ts`
- Test: `packages/installer/src/tests/backup/restore.test.ts`
- Test: `packages/installer/src/tests/operations/add.test.ts`
- Test: `packages/installer/src/tests/operations/update.test.ts`
- Test: `packages/installer/src/tests/operations/remove.test.ts`
- Test: `packages/installer/src/tests/transaction/failureInjection.test.ts`
- Test: `packages/installer/src/tests/transaction/recovery.test.ts`
- Create: `packages/installer/src/tests/fixtures/project.ts`
- Modify: `packages/installer/README.md`
- Modify: `packages/installer/docs/README.md`
- Modify: `releases/installer/next.md`

**Interfaces:**

```ts
export function createAddPlan(input: AddInput): Promise<InstallerPlan>;
export function createUpdatePlan(input: UpdateInput): Promise<InstallerPlan>;
export function createRemovePlan(input: RemoveInput): InstallerPlan;
export function executePlan(
  plan: InstallerPlan,
  runtime: InstallerRuntime,
): Promise<ExecutionResult>;
export function recoverTransaction(
  projectDir: string,
  runtime: InstallerRuntime,
): Promise<RecoveryResult>;
export function restoreBackup(
  projectDir: string,
  backupId: string,
): RestoreResult;
```

- [ ] **Step 1: Write and fail advisory usage-scan tests**

Cover literal token matches with file/line, target globs, exclusion of owned
files and `.git`/dependencies/build/transactions/backups, binary skipping,
deterministic results, and an explicit advisory-completeness warning.

- [ ] **Step 2: Implement usage scanning and verify GREEN**

```bash
bun test packages/installer/src/tests/usage/scan.test.ts
```

- [ ] **Step 3: Write and fail modified-removal backup tests**

Cover unchanged removal without backup, modified removal requiring
confirmation, confirmed backup of only modified owned files, backup manifest
checksums/provenance, user-modified dependency preservation, and exact restore.

- [ ] **Step 4: Implement backup and remove planning, verify GREEN**

```bash
bun test packages/installer/src/tests/backup packages/installer/src/tests/operations/remove.test.ts
```

Backups live outside `damat.lock.json` under `.damat/backups`; removal deletes
the installation record only after backup and file/package operations succeed.

- [ ] **Step 5: Write and fail add/update transaction tests**

Add tests cover dry run, writes, package operations, lock-last ordering, and
idempotent reinstall. Update tests cover unchanged replacement, no-op content,
modified-owned conflicts, confirmed backup before overwrite, provenance refresh,
removed old paths, and package ownership counts.

- [ ] **Step 6: Implement add/update planning and execution, verify GREEN**

```bash
bun test packages/installer/src/tests/operations
```

- [ ] **Step 7: Write failure-injection and crash-recovery tests**

Inject failure after every mutating operation. Compare exact starting/final
bytes for managed files, `package.json`, recognized manager lockfiles, and
`damat.lock.json`. Assert journal cleanup after ordinary rollback, surviving
journal recovery on the next invocation, and best-effort `node_modules` status
reporting.

- [ ] **Step 8: Implement execution/recovery and verify GREEN**

```bash
bun test packages/installer/src/tests/transaction/failureInjection.test.ts packages/installer/src/tests/transaction/recovery.test.ts
```

- [ ] **Step 9: Run the Task 7 gate**

```bash
bun test packages/installer/src/tests/usage packages/installer/src/tests/backup packages/installer/src/tests/operations packages/installer/src/tests/transaction
bun run --cwd packages/installer build
bun run --cwd packages/installer lint
bun run --cwd packages/installer check-types
bun scripts/check-code-lines.ts packages/installer
```

Update docs/release notes, report Task 7, and wait for approval.

---

### Task 8: Security policy, origin/mode parity, and Phase 3 exit gate

**Files:**

- Create: `packages/installer/src/security/policy.ts`
- Create: `packages/installer/src/security/report.ts`
- Create: `packages/installer/src/security/recipe.ts`
- Create: `packages/installer/src/security/index.ts`
- Test: `packages/installer/src/tests/security/policy.test.ts`
- Test: `packages/installer/src/tests/security/report.test.ts`
- Test: `packages/installer/src/tests/integration/originParity.test.ts`
- Test: `packages/installer/src/tests/integration/packageManagers.test.ts`
- Test: `packages/installer/src/tests/integration/rollbackParity.test.ts`
- Create: `packages/installer/src/tests/fixtures/artifact.ts`
- Modify: `packages/installer/src/plan/create.ts`
- Modify: `packages/installer/src/index.ts`
- Modify: `packages/installer/README.md`
- Modify: `packages/installer/docs/README.md`
- Create: `packages/installer/docs/origins.md`
- Create: `packages/installer/docs/recipes.md`
- Create: `packages/installer/docs/transactions.md`
- Create: `packages/installer/docs/lockfile-and-security.md`
- Modify: `releases/installer/next.md`
- Modify: `releases/installer/README.md`
- Modify: `package.json`

**Interfaces:**

```ts
export type VerificationPolicy = "off" | "warn" | "require";

export function evaluateSecurity(input: SecurityInput): SecurityReport;
export function assertSecurityAllowed(report: SecurityReport): void;
```

- [ ] **Step 1: Write and fail security-policy tests**

Cover verified/unverified/rejected/revoked registry status; local/Git/direct
origin reporting; off/warn/require policy; integrity mismatch; executable remote
fields; unsafe archive entries; package scripts; and explicit allow decisions.

- [ ] **Step 2: Implement structured reports and verify GREEN**

```bash
bun test packages/installer/src/tests/security
```

Every report includes origin, immutable identity, expected/computed integrity,
verification source, mode, findings, warnings, and allow/deny decision.

- [ ] **Step 3: Write and fail the all-origin parity fixture**

Install one fixture from local directory, Git, injected registry descriptor,
npm tarball metadata, local tarball, and remote tarball. Run both modes whenever
the resolved artifact advertises them. Assert equivalent owned output or
equivalent immutable package reference and complete provenance.

- [ ] **Step 4: Implement final public integration and verify parity GREEN**

```bash
bun test packages/installer/src/tests/integration/originParity.test.ts
```

- [ ] **Step 5: Add package-manager and rollback parity tests**

Run the same package plan through Bun/npm/pnpm/Yarn fake runners and inject one
failure per adapter. Assert exact project-file rollback and explicit
`node_modules` reconciliation status.

- [ ] **Step 6: Complete living docs and release notes**

Document current public APIs, origin grammar, mode precedence, recipes,
ownership, journals, modified-file backups, usage warnings, package managers,
security policy, and recovery. Keep change history only in
`releases/installer/next.md`.

- [ ] **Step 7: Add the targeted root line-check command**

Add:

```json
"check:lines:installer": "bun scripts/check-code-lines.ts packages/installer"
```

Do not change the existing repository-wide command.

- [ ] **Step 8: Run the complete Phase 3 gate**

```bash
bun install
bun run --cwd packages/installer build
bun run --cwd packages/installer test
bun run --cwd packages/installer lint
bun run --cwd packages/installer check-types
bun run check:lines:installer
bun test packages/installer/src/tests/integration
# Run from packages/installer:
bun pm pack --dry-run
git diff --check -- packages/installer releases/installer releases/README.md package.json bun.lock
git status --short
```

Verify package contents include `dist`, README, package metadata, and no source
tests or transaction fixtures. Report Phase 3 and wait for Phase 4 approval. Do
not commit or begin Kit/Module profile migration.
