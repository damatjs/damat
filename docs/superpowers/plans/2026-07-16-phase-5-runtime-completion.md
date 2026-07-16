# Phase 5 Runtime Completion Plan

**Status:** Complete

**Goal:** Complete packaged-module runtime parity without weakening the stable
source workflow or introducing `package.json` as a second Damat contract.

## Task 2 — Uniform module resolution

- Add a shared `ResolvedModule` contract and resolver to `@damatjs/installer`.
- Resolve source, Node package, and Damat package roots.
- Normalize root `damat.json` and legacy `module.json`.
- Validate declared paths against the artifact root.
- Expose the shared resolver through `@damatjs/module`.

## Task 3 — Packaged migrations

- Extend ORM module descriptors with resolved entry, models, and migrations.
- Make config loading use the shared resolver.
- Let migration discovery consume an explicit migration directory.
- Preserve source and link migration behavior.

## Task 4 — External routes

- Carry resolved modules through framework service initialization.
- Build file routers from the app route root plus module route providers.
- Mount packaged module routes under the configured module id.

## Task 5 — Runtime providers

- Import workflows, jobs, events, and pipelines after module registration.
- Resolve provider directories through conventional index files.
- Load providers before job workers begin consuming work.

## Task 6 — Package-aware codegen

- Make app codegen inspect each module's resolved entry and model directory.
- Keep generated output app-owned for immutable package modules.
- Preserve the current editable source output layout.

## Task 7 — Parity and documentation

- Add source, Node package, and Damat package fixtures.
- Prove entry, model, migration, route, and provider parity.
- Update living docs and unreleased notes for every changed package.
- Run focused tests, affected package builds/lints/type checks, and line checks.
