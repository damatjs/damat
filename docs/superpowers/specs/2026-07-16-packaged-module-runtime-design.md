# Damat Module Runtime Surface Design

**Status:** Revised for compatibility review
**Phase:** Damat v1 roadmap, Phase 5  
**Primary packages:** `@damatjs/module`, `@damatjs/framework`,
`@damatjs/orm`, `@damatjs/codegen`

## Purpose

Phase 5 lets the framework run the same module from editable source or an
installed package without introducing a second module contract. `damat.json`
remains the only Damat source of truth. Package metadata may help Bun install
or locate an artifact, but it never describes Damat capabilities.

Source installation remains the stable, recommended v1 workflow. Node and
Damat package storage remain early-alpha transports built around the same
runtime manifest.

## Principles

- `damat.json` is the only Damat runtime and installation contract.
- Source and package modules expose the same runtime surface.
- `package.json` is package-manager metadata, not a Damat manifest.
- Damat does not require or interpret `package.json.exports`.
- A runnable entry is required after resolution, but no entry field is required.
- Missing optional capabilities are normal and require no placeholder files.
- Declared paths are relative to their manifest directory and may not escape
  the artifact root.
- Runtime discovery does not copy package contents into application source.
- Source mode receives the stable v1 guarantees and documentation emphasis.
- Package mode remains explicit early alpha throughout this phase.
- Every code, test, fixture, script, and generated file stays within 100
  physical lines.

## Single Runtime Contract

A module declares its complete Damat surface in root `damat.json`:

```json
{
  "$schema": "https://damat.dev/schemas/damat-v1.json",
  "schemaVersion": 1,
  "kind": "module",
  "name": "billing",
  "version": "1.0.0",
  "module": {
    "models": "./src/models",
    "migrations": "./src/migrations",
    "routes": "./src/api/routes",
    "workflows": "./src/workflows",
    "jobs": "./src/jobs",
    "events": "./src/events",
    "pipelines": "./src/pipelines"
  }
}
```

For `kind: "module"`:

- `module.entry` is an optional override for a non-standard runtime entry.
- `module.models` is an optional model discovery location.
- `module.migrations` is an optional SQL migration location.
- `module.routes` is an optional file-router location.
- `module.workflows` is an optional workflow provider location.
- `module.jobs` is an optional job provider location.
- `module.events` is an optional event provider location.
- `module.pipelines` is an optional pipeline provider location.
- Existing `links`, `tests`, and `types` paths remain authoring and integration
  metadata; they are not framework bootstrap providers in Phase 5.

New modules use root `damat.json`. Existing modules with `src/module.json`
remain valid. Every declared path is resolved from the directory containing
that manifest, preserving existing values such as `"entry": "./index.ts"`.
There is no separate manifest export or manifest path field.

## Entry Discovery

The resolver locates a concrete runtime entry without requiring manifest
metadata:

1. Use the declared `module.entry` or legacy `paths.entry`, if present.
2. Otherwise check `index.ts` and `index.js` beside the located manifest.
3. For a root manifest, also check `src/index.ts` and `src/index.js`.
4. Fail only when none of those files exists.

An explicit entry remains useful for compiled or non-standard layouts, such as
`"./dist/index.js"`. It is always relative to the manifest directory and must
remain inside the artifact root.

## Artifact Root

Every runtime operation begins with a resolved artifact root:

- Source mode resolves the installed editable module directory.
- Node package mode resolves the installed package root under the target's
  package-manager layout.
- Damat package mode resolves the immutable artifact root recorded under
  `.damat/packages`.

Once the root is known, all three modes use the same steps:

1. Locate root `damat.json` or a supported legacy manifest.
2. Require a normalized module manifest.
3. Discover or resolve the concrete runtime entry.
4. Resolve declared capability paths from the manifest directory.
5. Reject absolute paths, parent traversal, and paths outside the artifact.
6. Return absent optional capabilities as absent rather than errors.

Package discovery details belong to the resolver implementation, not the
manifest schema.

## Package Metadata Boundary

`package.json` may contain ordinary fields such as `name`, `version`, `main`,
dependencies, and package-manager settings. Damat neither mirrors its runtime
paths into `package.json` nor compares the two files for drift.

The Node package backend uses package-manager resolution only to find the
artifact root. After that boundary, Damat reads `damat.json` exactly as it does
for source mode. A package does not need subpath exports such as `./models`,
`./routes`, or `./manifest`.

The Damat package backend already records its artifact root directly and
therefore does not need Node package metadata for runtime discovery.

## Uniform Resolved Module

The module package exposes one internal resolved representation:

```ts
interface ResolvedModule {
  root: string;
  manifest: ModuleManifest;
  entry: string;
  models?: string;
  migrations?: string;
  routes?: string;
  workflows?: string;
  jobs?: string;
  events?: string;
  pipelines?: string;
}
```

This is a filesystem-level description, not a loaded module instance. Later
Phase 5 tasks consume it for imports, migrations, routing, bootstrap providers,
and code generation.

The resolver accepts a framework module location and produces the same
`ResolvedModule` regardless of installation mode. No downstream subsystem
branches on source versus package after resolution.

## Loading Boundaries

The resolved entry is imported as the module's runtime service definition.
Optional capability paths are loaded only by the subsystem that owns them:

- ORM migration discovery reads `migrations`.
- Framework routing scans `routes`.
- Workflow bootstrap loads `workflows`.
- Job bootstrap loads `jobs`.
- Event bootstrap loads `events`.
- Pipeline bootstrap loads `pipelines`.
- ORM code generation inspects `models`.

This avoids one aggregate import that eagerly loads capabilities a module does
not provide.

## Compatibility

Legacy `module.json` remains readable during the existing compatibility window.
The current library layout is preserved: `src/module.json` may declare
`"entry": "./index.ts"`, and that path resolves from `src/`. New module
scaffolds write root `damat.json` but omit `module.entry` when the conventional
`src/index.ts` entry is used.

The Phase 5 runtime does not add new package publication, registry automation,
package export generation, or package dependency resolution. Package mode
continues to require the existing experimental opt-in.

## Errors

Resolution fails before runtime initialization when:

- No supported manifest is found, or the located manifest is malformed.
- The artifact is not `kind: "module"`.
- A declared path is absolute, uses parent traversal, or escapes the root.
- No declared or conventional runtime entry exists.
- A declared optional capability path does not exist.

Errors identify the module, capability, and resolved location. An omitted
optional capability is not an error.

## Testing

Task-level tests cover:

- Valid manifests with omitted, conventional, and overridden entries.
- Root `damat.json` resolving `src/index.ts`.
- Existing `src/module.json` resolving a sibling `index.ts`.
- Safe relative path resolution and traversal rejection.
- Optional capability omission.
- Declared-but-missing capability errors.
- Source, Node package, and Damat package locations resolving to the same
  normalized runtime surface.
- A reference module reaching parity across HTTP, migrations, models,
  workflows, jobs, events, and pipelines by the Phase 5 exit gate.

Every Phase 5 task runs its focused package tests, affected regression tests,
type checking, lint, build, documentation checks, and the 100-line checker.

## Delivery Boundaries

Phase 5 remains split into the roadmap's approval gates:

1. Formalize the optional entry override and conventional discovery rules.
2. Resolve source and package artifact roots into one `ResolvedModule`.
3. Load migrations directly from resolved modules.
4. Add external route providers.
5. Bootstrap workflows, jobs, events, and pipelines.
6. Make code generation consume resolved model locations.
7. Prove source/package parity with a reference module.

Task 1 changes only the contract, validation, scaffolding, documentation, and
tests. It does not add packaged runtime loading.

## Exit Criteria

Phase 5 is complete when one reference module behaves identically from editable
source and an installed Node package for HTTP routes, database migrations,
models, workflows, jobs, events, and pipelines. Damat package storage uses the
same resolver contract but remains early alpha.
