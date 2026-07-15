# Damat v1 Gated Delivery Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this roadmap task-by-task. Each task is a user approval gate; do not begin the next task until the previous report is approved.

**Goal:** Deliver the approved Damat v1 architecture through independently testable phases without intermediate package-version bumps.

**Architecture:** Damat remains a Bun and TypeScript backend platform whose public CLI composes small capability packages. A source-agnostic installer manages kits and modules in source or package mode, while the framework gains durable jobs, durable pipelines, optional durable events, provider contracts, structured hourly logs, and a complete reference application.

**Tech Stack:** Bun, TypeScript ESM, Hono, Effect, PostgreSQL, Redis, Turborepo, Changesets.

## Global Constraints

- Complete one task at a time, report the diff and verification, and wait for explicit user approval before the next task.
- Preserve unrelated user changes in the dirty worktree.
- Use Bun commands only inside the Damat repository.
- Do not add heavy dependencies; prefer existing `@damatjs/*` packages and built-ins.
- Keep every code file at 100 physical lines or fewer. When a file would exceed the limit, split it by concern into clearly named sibling files or subfolders and import/call those units explicitly.
- The 100-line limit applies to production code, tests, scripts, fixtures, and generated code; generated output must be emitted in named chunks instead of receiving an exemption.
- Every task must leave all new and touched code files at or below 100 lines and run the line-count checker before reporting completion.
- Use TDD for each behavior change.
- Do not bump package versions during implementation; write package changes to `releases/<package>/next.md`.
- At the final release gate, all public Damat platform packages move to `1.0.0` together.
- Third-party modules and registry artifacts retain independent semantic versions.
- Installation origin and installation mode are independent.
- Supported origins include local files/directories, Git/GitHub, the Damat registry, npm packages, and tarballs.
- Supported installation modes are `source` and `package`.
- Mode precedence is CLI `--mode`, manifest `install.default`, then system default `source`.
- Never silently change an explicitly requested installation mode.
- Record immutable provenance for every installation.
- Git tags create stable registry releases; commit SHAs are the immutable source identity.
- Registry hosting automation beyond the artifact contract is outside the v1 implementation scope.

---

## Approval Protocol

Every numbered task is an independent review gate:

1. Implement only that task.
2. Run its focused tests and the task-level regression suite.
3. Report files changed, behavior delivered, test results, and known follow-up work.
4. Wait for the user to say `go ahead` before starting the next task.

No automatic commits are made while unrelated user changes remain in the worktree. A checkpoint commit is created only when the user explicitly requests it.

## Phase 1: Neutral CLI Foundation

Detailed plan: [2026-07-15-phase-1-neutral-cli.md](./2026-07-15-phase-1-neutral-cli.md)

Deliverables:

- `@damatjs/cli` no longer depends on `@damatjs/logger` or `dotenv`.
- The core receives arguments, working directory, environment, logger, and output through an injected runtime.
- `runCli` returns an exit result and never terminates the host process.
- Registries and config caches are invocation-local.
- Banner and verbose behavior are opt-in.
- The Damat CLI adapter preserves the current Damat console experience.

Exit gate:

- Core CLI tests, Damat CLI tests, both builds, type checking, living docs, and unreleased notes pass.

## Phase 2: CLI Capability Packages

Create focused packages consumed by the `damat` composer:

- `@damatjs/cli-app`: create, clone, dev, build, start.
- `@damatjs/cli-module`: module authoring and installation commands.
- `@damatjs/cli-kit`: generic kit commands.
- `@damatjs/cli-codegen`: command adapters for generators.
- `@damatjs/damat-cli`: composition, Damat runtime adapter, version, and banner only.

Tasks:

1. Establish the capability-package command contract and package test harness.
2. Extract app lifecycle commands.
3. Extract kit commands without changing behavior.
4. Extract module commands without changing behavior.
5. Extract codegen/barrel commands.
6. Reduce `@damatjs/damat-cli` to composition and run the complete CLI regression suite.

Exit gate:

- Every command package runs standalone in tests and the composed `damat` binary retains command/help compatibility.

## Phase 3: Generic Installer Engine

Create `@damatjs/installer` as a headless transactional engine.

Tasks:

1. Define artifact origin, installation recipe, mode, plan, operation, provenance, and lockfile schemas.
2. Implement local directory, Git, registry artifact, npm tarball, and direct tarball source resolvers.
3. Resolve Git branches/tags to commit SHAs and compute local/npm/registry integrity.
4. Implement declarative mapping rules and reject executable remote hooks.
5. Implement collision detection, file ownership checksums, dry-run plans, and rollback journals.
6. Implement package-manager adapters for Bun, npm, pnpm, and Yarn targets.
7. Implement `add`, `update`, and `remove` transactions against committed `damat.lock.json`.
8. Add security policy reporting for verified and unverified sources.

Exit gate:

- The same fixture installs from every supported origin in both supported modes where applicable, and failure injection proves rollback leaves the target unchanged.

## Phase 4: Kit and Module Installation Profiles

Tasks:

1. Move kit manifest mapping into an installer recipe profile.
2. Add kit update/remove/list/plan and migrate `damat-kits.json` records into `damat.lock.json`.
3. Extend `module.json` with `install.modes` and `install.default`, defaulting to source.
4. Implement the Damat source-mode profile for modules, routes, workflows, links, jobs, events, pipelines, tests, environment, TypeScript, and config mutations.
5. Replace current module add/update/remove internals with the shared engine.
6. Remove `damat module publish` and its npm-shaped gateway client.
7. Add migration guidance and safe package dependency reference counting.

Exit gate:

- Kit and module commands share one engine, accept all approved origins, honor mode precedence, and safely update/remove modified installations.

## Phase 5: Packaged Module Runtime

Tasks:

1. Define module package exports for entry, manifest, models, migrations, routes, workflows, jobs, events, and pipelines.
2. Add a module resolver that treats source directories and package exports uniformly.
3. Load packaged migrations without copying package contents into the app.
4. Add external route providers to the framework router.
5. Load packaged workflows/jobs/events/pipelines during framework bootstrap.
6. Make ORM codegen inspect source-mode and package-mode modules.
7. Add parity tests proving one module behaves identically in both modes.

Exit gate:

- A reference module installs and runs from editable source and from `node_modules` with the same HTTP, database, job, event, and pipeline behavior.

## Phase 6: Codegen Split and Rename

Tasks:

1. Extract pure model-to-TypeScript/Zod generation into `@damatjs/schema-codegen`.
2. Extract Damat CRUD workflow/route scaffolding into `@damatjs/module-generator`.
3. Keep generation deterministic and preserve scaffold-once files.
4. Move CLI adapters into `@damatjs/cli-codegen`.
5. Replace internal imports and documentation.
6. Mark the existing `@damatjs/codegen` package as a compatibility/deprecation surface without attempting a lower version.

Exit gate:

- Pure schema generation has no framework dependency, module generation consumes it, and existing fixtures produce equivalent intended output.

## Phase 7: Durable Events and Jobs

Tasks:

1. Add PostgreSQL job-run, attempt, schedule, and deduplication storage.
2. Make PostgreSQL the job source of truth and Redis an optional wake-up/lease accelerator.
3. Add heartbeat, cancellation, retry, dead-letter, reconciliation, and retention behavior.
4. Add transactional event outbox storage.
5. Keep ordinary events ephemeral while allowing explicit durable event-log policies.
6. Add idempotency APIs and document at-least-once delivery.
7. Add separate API and worker bootstrap roles.

Exit gate:

- Redis-loss and worker-crash tests prove pending work is recoverable from PostgreSQL without duplicate side effects when handlers use idempotency keys.

## Phase 8: Durable Pipeline Infrastructure

Tasks:

1. Define sequential and parallel pipeline/stage contracts.
2. Add PostgreSQL run, stage-run, transition, retry, and output-reference storage.
3. Execute jobs and workflows as typed pipeline stages.
4. Add resume, retry, cancellation, timeout, status, and reconciliation operations.
5. Keep workflow compensation local to workflows and prevent duplicate pipeline compensation.
6. Port representative shapes from the Bekur and registry pipelines into framework tests.

Exit gate:

- A multi-stage pipeline with a parallel group survives process restart and resumes only unfinished stages.

## Phase 9: Provider Infrastructure

Tasks:

1. Define a generic provider lifecycle for registration, configuration, health, selection, and observability.
2. Keep provider adapters above ModuleService-owned domain state rather than inheriting ModuleService.
3. Refactor auth integration onto the provider lifecycle while retaining auth-specific contracts.
4. Define payment contracts for customer, checkout, payment, subscription, refund, and webhook normalization.
5. Add example auth and payment provider setup without shipping a new payment vendor implementation.

Exit gate:

- Applications can select custom auth/payment adapters through stable contracts while domain data remains owned by modules.

## Phase 10: Reference Backend and Create Scaffolding

Tasks:

1. Add a complete event-to-pipeline-to-job example to `backend/default`.
2. Add persisted pipeline status and history routes.
3. Add restart/recovery integration tests.
4. Scaffold events, jobs, pipelines, and worker entry points in `damat create`.
5. Add development and production API/worker scripts.
6. Verify newly generated applications build and test offline before external services are configured.

Exit gate:

- The reference backend demonstrates the full runtime and a generated application contains the same supported structure with safe defaults.

## Phase 11: Hourly Structured Logging

Tasks:

1. Define a versioned JSONL log-entry schema.
2. Partition by each entry timestamp under `logs/YYYY-MM-DD/HH/`.
3. Write `all.jsonl` and `errors.jsonl` through an ordered asynchronous writer.
4. Add hourly rotation, retention, and optional compression.
5. Implement or remove the currently ignored file-name options.
6. Add optional Markdown rendering from canonical JSONL.

Exit gate:

- Midnight/hour-boundary, rotation, concurrent-write, shutdown-flush, and rendering tests pass without assigning records to the wrong partition.

## Phase 12: Repository-wide File Decomposition

The initial audit found 301 TypeScript/JavaScript files over 100 lines. Earlier
phases prevent new debt and split every file they touch; this phase removes the
remaining legacy debt before v1.

Tasks:

1. Add a repository line-count report grouped by package and code ownership area.
2. Decompose remaining production files package-by-package into named callable/imported units.
3. Decompose long tests into behavior-focused sibling suites with shared fixtures/helpers in named files.
4. Change generators that emit long files to emit deterministic named chunks and a small composing index.
5. Decompose scripts and fixtures without changing their public behavior.
6. Run each affected package’s focused tests immediately after its decomposition.
7. Enable the repository-wide 100-line code-file check in CI after the count reaches zero.

Exit gate:

- The repository line-count checker reports zero code files over 100 physical lines, and every affected package’s tests/build pass.

## Phase 13: Registry Artifact Contract and v1 Release

Tasks:

1. Define the framework-agnostic registry artifact envelope and Damat module/kit kinds.
2. Define Git tag, commit SHA, integrity, verification, and build-attestation fields.
3. Update clients and MCP tools to consume immutable registry artifacts.
4. Replace duplicate registry loaders with `@damatjs/registry-client`.
5. Audit living documentation and consolidate all `next.md` release notes.
6. Configure Changesets lockstep release grouping for public Damat platform packages.
7. Run full build, typecheck, lint, unit, integration, recovery, installer, generated-app, and package-content gates.
8. Move eligible public packages to `1.0.0`, leaving renamed/deprecated history legally consistent.

Exit gate:

- The monorepo and packed artifacts pass every release gate, documentation matches v1 behavior, and the release graph contains no mismatched public platform versions.
