# Damat Module Runtime Surface Design

**Status:** Approved for implementation planning  
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
- A module entry is required; every other runtime capability is optional.
- Missing optional capabilities are normal and require no placeholder files.
- Paths are relative to the artifact root and may not escape it.
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
    "entry": "./src/index.ts",
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

- `module.entry` is required and points to the module's default runtime entry.
- `module.models` is an optional model discovery location.
- `module.migrations` is an optional SQL migration location.
- `module.routes` is an optional file-router location.
- `module.workflows` is an optional workflow provider location.
- `module.jobs` is an optional job provider location.
- `module.events` is an optional event provider location.
- `module.pipelines` is an optional pipeline provider location.
- Existing `links`, `tests`, and `types` paths remain authoring and integration
  metadata; they are not framework bootstrap providers in Phase 5.

The manifest itself always lives at the artifact root. There is no separate
manifest export or manifest path field.

## Artifact Root

Every runtime operation begins with a resolved artifact root:

- Source mode resolves the installed editable module directory.
- Node package mode resolves the installed package root under the target's
  package-manager layout.
- Damat package mode resolves the immutable artifact root recorded under
  `.damat/packages`.

Once the root is known, all three modes use the same steps:

1. Read `<root>/damat.json`.
2. Require `kind: "module"` and a safe `module.entry`.
3. Resolve declared runtime paths against the root.
4. Reject absolute paths, parent traversal, and resolved paths outside the root.
5. Return absent optional capabilities as absent rather than errors.

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

The required entry is imported as the module's runtime service definition.
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

Legacy `module.json` remains readable during the existing 0.x compatibility
window. Normalization supplies the conventional entry path when the legacy
manifest does not declare one. New module scaffolds continue writing only root
`damat.json` and always declare `module.entry`.

The Phase 5 runtime does not add new package publication, registry automation,
package export generation, or package dependency resolution. Package mode
continues to require the existing experimental opt-in.

## Errors

Resolution fails before runtime initialization when:

- `damat.json` is missing or malformed.
- The artifact is not `kind: "module"`.
- `module.entry` is missing.
- A declared path is absolute, uses parent traversal, or escapes the root.
- The required entry does not exist.
- A declared optional capability path does not exist.

Errors identify the module, capability, and resolved location. An omitted
optional capability is not an error.

## Testing

Task-level tests cover:

- Valid manifests with entry-only and full runtime surfaces.
- Required entry validation.
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

1. Formalize the `damat.json` runtime surface and validation.
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
