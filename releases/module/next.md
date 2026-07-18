# @damatjs/module Unreleased

## Changed

`readModuleManifest` now prefers universal `damat.json`, normalizes its module
metadata into `ModuleManifest`, and falls back to legacy `module.json` during the
0.x migration window. Runtime location accepts either filename at the package
root or under `src/`.

Module path metadata now includes routes, jobs, events, pipelines, links, and
tests in addition to the existing entry, model, migration, workflow, and type
paths.

Standalone runtime and registry readiness now resolve entries by convention:
`index.ts`, `index.js`, `src/index.ts`, then `src/index.js`. A declared entry
remains an override for non-standard layouts. Ephemeral port requests remain
supported on Bun runtimes where the underlying Node-server adapter rejects
port zero.

The package now exposes `resolveModuleArtifact`, `resolveArtifactRoot`, and the
shared `ResolvedModule` type used by framework, ORM, and codegen consumers.
It also re-exports the durable pipeline authoring surface so a portable pipeline
provider uses the same contract in standalone module and assembled app runtimes.

## Action required

Use root `damat.json` for new modules. Existing `module.json` packages continue
to work, including `src/module.json` packages using `"./index.ts"`. Keep an
explicit entry only for a non-standard layout.
