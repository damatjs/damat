# @damatjs/module Unreleased

## Changed

`readModuleManifest` now prefers universal `damat.json`, normalizes its module
metadata into `ModuleManifest`, and falls back to legacy `module.json` during the
0.x migration window. Runtime location accepts either filename at the package
root or under `src/`.

Module path metadata now includes routes, jobs, events, pipelines, links, and
tests in addition to the existing entry, model, migration, workflow, and type
paths.

Standalone runtime startup resolves declared entry and route paths from the
manifest. Ephemeral port requests remain supported on Bun runtimes where the
underlying Node-server adapter rejects port zero.

## Action required

Use root `damat.json` for new modules. Existing `module.json` packages continue
to work, but should migrate before the compatibility window closes.
