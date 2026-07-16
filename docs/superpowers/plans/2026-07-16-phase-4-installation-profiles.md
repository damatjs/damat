# Phase 4 Installation Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace separate Kit and Module installation implementations with one
stable source installer driven by optional bidirectional `damat.json` profiles,
while gating Node and Damat package backends as early alpha.

**Architecture:** `@damatjs/installer` parses the universal manifest, matches a
provider profile to a receiver profile, and emits its existing declarative
recipe and transactional plans. CLI support supplies origin/runtime adapters;
Kit and Module supply presentation and legacy conversion only. Framework code
resolves path and alpha package module locations without taking ownership of
installation.

**Tech Stack:** Bun, strict TypeScript ESM, Node built-ins, Turborepo.

## Global Constraints

- Work on the existing `expansion` branch and current workspace.
- Preserve staged `.github/workflows/test.yml` and `AGENTS.md` content and
  staging state.
- Use Bun only and add no runtime third-party dependency.
- Use TDD: focused RED, minimal GREEN, refactor, focused regression.
- Keep every touched code, test, fixture, script, and generated file at or
  below 100 physical lines.
- Use `apply_patch` for source and documentation edits.
- `damat.json` is optional for a receiver and declarative only.
- Mode precedence is CLI override, manifest default, then `source`.
- Package backend is independent from mode and never silently falls back.
- Source mode is stable. Package mode requires explicit alpha opt-in.
- Never mutate or claim `damat.config.ts`, `tsconfig.json`, `.env*`, barrels, or
  user call sites; report integration instructions instead.
- Existing `module.json` and `damat-kit.json` remain readable during 0.x, while
  all new scaffolds write `damat.json`.
- Remove `damat module publish`; Git-hosted registry automation is later work.
- Do not commit or push Phase 4 automatically.

---

### Task 1: Universal manifest schema and legacy normalization

**Files:**

- Create: `packages/installer/src/types/manifest.ts`
- Create: `packages/installer/src/schema/manifest/core.ts`
- Create: `packages/installer/src/schema/manifest/install.ts`
- Create: `packages/installer/src/schema/manifest/index.ts`
- Create: `packages/installer/src/manifest/constants.ts`
- Create: `packages/installer/src/manifest/read.ts`
- Create: `packages/installer/src/manifest/index.ts`
- Modify: `packages/installer/src/types/index.ts`
- Modify: `packages/installer/src/schema/index.ts`
- Modify: `packages/installer/src/index.ts`
- Test: `packages/installer/src/tests/schema/manifest.test.ts`
- Test: `packages/installer/src/tests/manifest/read.test.ts`

**Interfaces:**

```ts
export type DamatKind = "application" | "module" | "kit" | "package";
export type PackageBackend = "node" | "damat";

export interface ProvidedCapability {
  from: string;
  fallbackTo?: string;
}

export interface AcceptedCapability {
  to: string;
}

export interface DamatInstallProfile {
  modes?: InstallMode[];
  default?: InstallMode;
  packageBackends?: PackageBackend[];
  provides?: Record<string, ProvidedCapability>;
  accepts?: Record<string, AcceptedCapability>;
  ignore?: string[];
  packages?: Record<string, string>;
  usageHints?: UsageHint[];
  instructions?: { add?: string[]; remove?: string[] };
}

export interface DamatManifest {
  $schema?: string;
  schemaVersion: 1;
  kind: DamatKind;
  name: string;
  version?: string;
  install?: DamatInstallProfile;
  module?: Record<string, unknown>;
}

export const DAMAT_MANIFEST_FILENAME = "damat.json";
export function parseDamatManifest(input: unknown): DamatManifest;
export function readDamatManifest(root: string): DamatManifest;
```

- [ ] Write schema tests for provider-only, receiver-only, combined, module
  metadata, default/mode consistency, capability names, `{id}` destinations,
  unsafe paths, unknown fields, and executable-field rejection.
- [ ] Run `bun test packages/installer/src/tests/schema/manifest.test.ts` and
  verify RED on missing exports.
- [ ] Implement the types and small schema helpers. Reuse existing assertion,
  safe-path, mode, package-map, and usage-hint parsers.
- [ ] Run the schema test and verify GREEN.
- [ ] Write read tests for missing, malformed, and valid `damat.json`.
- [ ] Implement strict manifest reading and public exports.
- [ ] Run `bun test packages/installer/src/tests/schema packages/installer/src/tests/manifest`.

### Task 2: Capability matching and recipe conversion

**Files:**

- Create: `packages/installer/src/profile/types.ts`
- Create: `packages/installer/src/profile/destination.ts`
- Create: `packages/installer/src/profile/match.ts`
- Create: `packages/installer/src/profile/recipe.ts`
- Create: `packages/installer/src/profile/index.ts`
- Modify: `packages/installer/src/index.ts`
- Test: `packages/installer/src/tests/profile/match.test.ts`
- Test: `packages/installer/src/tests/profile/recipe.test.ts`

**Interfaces:**

```ts
export interface ProfileOverrides {
  targets?: Record<string, string>;
}

export interface CapabilityMatch {
  capability: string;
  from: string;
  to: string;
  source: "override" | "receiver" | "fallback";
}

export interface MatchProfilesInput {
  provider: DamatManifest;
  receiver?: DamatManifest;
  overrides?: ProfileOverrides;
}

export function matchProfiles(input: MatchProfilesInput): CapabilityMatch[];
export function createProfileRecipe(input: MatchProfilesInput): InstallRecipe;
```

- [ ] Write RED tests proving override > receiver > fallback > named error.
- [ ] Implement destination expansion with only `{id}` and safe-path validation.
- [ ] Write RED tests converting matches, modes, ignore, packages, and usage
  hints into one deterministic `InstallRecipe`.
- [ ] Implement conversion without framework-specific capability names.
- [ ] Run `bun test packages/installer/src/tests/profile packages/installer/src/tests/recipe`.

### Task 3: Package backend axis and alpha Damat storage

**Files:**

- Modify: `packages/installer/src/types/plan.ts`
- Modify: `packages/installer/src/types/lockfile.ts`
- Modify: `packages/installer/src/schema/lock-record.ts`
- Modify: `packages/installer/src/plan/create.ts`
- Create: `packages/installer/src/plan/damat-package.ts`
- Modify: `packages/installer/src/transaction/record.ts`
- Create: `packages/installer/src/package-backend/select.ts`
- Create: `packages/installer/src/package-backend/index.ts`
- Modify: `packages/installer/src/index.ts`
- Test: `packages/installer/src/tests/plan/packageBackend.test.ts`
- Test: `packages/installer/src/tests/operations/damatPackage.test.ts`
- Test: `packages/installer/src/tests/schema/lockfile.test.ts`

**Interfaces:**

```ts
export interface PackagePlanInput {
  packageBackend?: PackageBackend;
}

export interface PackagePlanState {
  packageBackend?: PackageBackend;
  experimental?: boolean;
}

export interface PackageRecordState {
  packageBackend?: PackageBackend;
}
```

`CreateInstallPlanInput` consumes `PackagePlanInput`, `InstallerPlan` contains
`PackagePlanState`, and `InstallationRecord` contains `PackageRecordState`.

For `package + node`, retain immutable package-manager operations. For
`package + damat`, map every artifact file beneath
`.damat/packages/<installationId>/` and reject symlinks or artifacts whose
manifest declares unresolved external runtime packages.

- [ ] Write RED tests for source rejecting a backend, package requiring a
  supported explicit backend, and no backend fallback.
- [ ] Add backend selection and lock/plan parsing.
- [ ] Write RED tests for project-local Damat package writes, update, remove,
  rollback, and self-contained validation.
- [ ] Implement Damat package operations by reusing transactional file writes.
- [ ] Run `bun test packages/installer/src/tests/plan packages/installer/src/tests/operations packages/installer/src/tests/transaction`.

### Task 4: Shared CLI installer adapter

**Files:**

- Create: `packages/cli/support/src/installer/origin.ts`
- Create: `packages/cli/support/src/installer/runner.ts`
- Create: `packages/cli/support/src/installer/runtime.ts`
- Create: `packages/cli/support/src/installer/options.ts`
- Create: `packages/cli/support/src/installer/index.ts`
- Modify: `packages/cli/support/src/index.ts`
- Modify: `packages/cli/support/package.json`
- Test: `packages/cli/support/src/tests/installer/origin.test.ts`
- Test: `packages/cli/support/src/tests/installer/runtime.test.ts`

**Interfaces:**

```ts
export function originFromArgument(source: string, cwd: string): OriginRequest;
export function createInstallerPorts(ctx: CommandContext): AcquisitionPorts;
export function createInstallerRuntime(ctx: CommandContext): InstallerRuntime;
export function installerOptions(ctx: CommandContext): {
  mode?: InstallMode;
  packageBackend?: PackageBackend;
  targets?: Record<string, string>;
};
```

Origin parsing accepts local paths, registry refs, Git/GitHub sources, npm
references, and tarball URLs without choosing install mode.

- [ ] Write RED origin grammar tests, including ambiguous bare refs and explicit
  `npm:` / `registry:` / `file:` forms.
- [ ] Implement pure argument parsing and structured command/fetch ports.
- [ ] Write RED runtime tests for dry-run, manager selection, script policy, and
  logger forwarding.
- [ ] Implement the runtime adapter and exports.
- [ ] Run `bun test packages/cli/support/src/tests/installer` plus the package
  build/lint/type gate.

### Task 5: Stable Kit commands on the shared installer

**Files:**

- Create: `packages/cli/kit/src/commands/kit/profile/legacy.ts`
- Create: `packages/cli/kit/src/commands/kit/profile/load.ts`
- Create: `packages/cli/kit/src/commands/kit/profile/index.ts`
- Create: `packages/cli/kit/src/commands/kit/shared/plan.ts`
- Create: `packages/cli/kit/src/commands/kit/shared/execute.ts`
- Create: `packages/cli/kit/src/commands/kit/shared/report.ts`
- Modify: `packages/cli/kit/src/commands/kit/add/command.ts`
- Modify: `packages/cli/kit/src/commands/kit/add/handler.ts`
- Delete after migration: `packages/cli/kit/src/commands/kit/add/copyPlanned.ts`
- Delete after migration: `packages/cli/kit/src/commands/kit/add/recordInstalledKit.ts`
- Delete after migration: `packages/cli/kit/src/commands/kit/add/reportPlan.ts`
- Delete after migration: `packages/cli/kit/src/commands/kit/add/types.ts`
- Create commands beneath `commands/kit/plan/`, `list/`, `update/`, `remove/`
- Modify: `packages/cli/kit/src/commands/kit/init.ts`
- Modify: `packages/cli/kit/src/commands/kit/validate.ts`
- Modify: `packages/cli/kit/src/commands/kit/index.ts`
- Modify: `packages/cli/kit/package.json`
- Test: `packages/cli/kit/src/tests/profile.test.ts`
- Test: `packages/cli/kit/src/tests/installCommands.test.ts`

**Behavior:**

- `damat kit init` writes a provider `damat.json` and refuses overwrite.
- Legacy `damat-kit.json` is converted in memory when no `damat.json` exists.
- `add` and `plan` resolve every approved origin and target receiver profile.
- `list` reads `damat.lock.json`, filtered to `kind: "kit"`.
- `update` reuses recorded provenance and requires confirmation for modifications.
- `remove` backs up only modified owned files and reports integration warnings.
- Package mode requires `--experimental-package`.

- [ ] Add RED profile/init tests, then implement legacy conversion and scaffold.
- [ ] Add RED add/plan tests, then replace copy and `damat-kits.json` recording
  with `resolveArtifact`, `createProfileRecipe`, and installer plans.
- [ ] Add RED list/update/remove tests and implement them through the engine.
- [ ] Delete superseded Kit source/copy/record/plan code only after its new
  characterization cases pass.
- [ ] Run the full `@damatjs/cli-kit` gate and the installer integration suite.

### Task 6: Module manifest and stable Module commands

**Files:**

- Split: `packages/module/src/manifest/types.ts`
- Create: `packages/module/src/manifest/damat.ts`
- Modify: `packages/module/src/manifest/read.ts`
- Modify: `packages/module/src/manifest/validate.ts`
- Modify: `packages/module/src/runtime/locate.ts`
- Create: `packages/cli/module/src/commands/module/profile/legacy.ts`
- Create: `packages/cli/module/src/commands/module/profile/load.ts`
- Create: `packages/cli/module/src/commands/module/profile/instructions.ts`
- Create: `packages/cli/module/src/commands/module/shared/plan.ts`
- Create: `packages/cli/module/src/commands/module/shared/execute.ts`
- Replace add/update/remove/list installation internals with shared-engine calls.
- Modify: `packages/cli/module/package.json`
- Test: `packages/module/tests/damat-manifest.test.ts`
- Test: `packages/cli/module/src/tests/moduleInstallProfiles.test.ts`
- Test: `packages/cli/module/src/tests/moduleIntegrationNotices.test.ts`

**Behavior:**

- `damat.json` module metadata normalizes to the existing `ModuleManifest` API.
- `module.json` remains a read fallback only.
- Source layout capabilities cover module, routes, workflows, links, jobs,
  events, pipelines, tests, migrations, models, and types.
- Add/update/remove never write shared host configuration or barrels.
- Reports provide exact `damat.config.ts`, TypeScript, environment, and barrel
  steps for add and remove.
- List reads `damat.lock.json`, not directories or config provenance.

- [ ] Add RED universal/legacy manifest parity tests, split the 100-line type
  file, and implement normalization.
- [ ] Add RED source plan tests covering every Damat capability and two receiver
  layouts; implement the Damat profile.
- [ ] Add RED byte-preservation tests for all shared integration files.
- [ ] Replace Module handlers with generic plan/execute/report units.
- [ ] Remove mutation helpers only after no command imports them and legacy
  characterization coverage has migrated.
- [ ] Run `bun test packages/module packages/cli/module/src/tests` and package
  build/lint/type gates.

### Task 7: Alpha package resolution, scaffolds, and publish removal

**Files:**

- Create: `packages/framework/src/services/moduleLocation.ts`
- Modify: `packages/framework/src/services/moduleService.ts`
- Modify: `packages/framework/src/config/types/module.ts`
- Test: `packages/framework/src/tests/services/moduleLocation.test.ts`
- Create: `packages/cli/app/src/commands/create/scaffold/templates/damatManifest.ts`
- Modify: `packages/cli/app/src/commands/create/scaffold/templates/index.ts`
- Modify: `packages/cli/app/src/commands/create/writeScaffold.ts`
- Test: `packages/cli/app/src/tests/create.damat-manifest.test.ts`
- Modify module-init templates to emit only `damat.json`.
- Delete: `packages/cli/module/src/commands/module/publish/`
- Delete: `packages/cli/module/src/tests/modulePublish/`
- Modify: `packages/cli/module/src/commands/module/index.ts`

**Interfaces:**

```ts
export type ModuleResolveLocation =
  | string
  | { type: "package"; name: string }
  | { type: "damat"; path: string };

export function resolveModuleImport(
  location: ModuleResolveLocation,
  cwd: string,
): string;
```

String locations preserve current source behavior. Package locations resolve
through the app's package context. Damat locations must remain inside
`.damat/packages`. All imported entries still default-export `defineModule()`.

- [ ] Write RED path/package/Damat resolution and traversal tests.
- [ ] Implement location parsing/import resolution in a focused file.
- [ ] Add RED app/module scaffold tests for valid `damat.json` and required
  directories; implement templates.
- [ ] Add RED capability tests proving `publish` is absent, then remove its
  command, gateway, archive, metadata, validation, and tests.
- [ ] Run framework, CLI app, and CLI module gates.

### Task 8: Migration docs, release records, parity, and final gate

**Files:**

- Modify living docs for Installer, Module, CLI Kit, CLI Module, CLI App,
  Framework, `docs/GUIDE.md`, and relevant `docs/guide/` chapters.
- Modify `releases/<package>/next.md` and indices for every changed package.
- Create: `docs/guide/21-damat-manifest.md`
- Create integration fixtures/tests under
  `packages/installer/src/tests/integration/profiles/`.

- [ ] Add parity fixtures proving Kit and Module source installs resolve the
  same provider into two receiver layouts with exact rollback.
- [ ] Add alpha package parity for one self-contained module through Node and
  Damat locations.
- [ ] Update living docs as current behavior only; put legacy migration and
  alpha warnings in release notes and the dedicated migration section.
- [ ] Run focused package build/test/lint/type checks for Installer, CLI Support,
  CLI Kit, Module, CLI Module, CLI App, and Framework.
- [ ] Run `bun run check:lines`, `bun run build`, `bun run test`,
  `bun run check-types`, package dry-runs, and `git diff --check`.
- [ ] Record any unrelated repository-wide lint failure separately; do not edit
  unrelated packages to hide it.
- [ ] Report Phase 4 with test counts, coverage, package-mode alpha limits, and
  the exact uncommitted status. Do not commit or push.
