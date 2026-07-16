# Damat Installation Profiles Design

**Status:** Approved for implementation planning  
**Phase:** Damat v1 roadmap, Phase 4  
**Primary packages:** `@damatjs/installer`, `@damatjs/cli-kit`,
`@damatjs/cli-module`

## Purpose

Phase 4 gives applications, modules, and kits one optional, bidirectional
installation manifest: `damat.json`. A source artifact describes what it
provides, a receiving project describes what it accepts, and the generic
installer connects the two without knowing either framework's layout.

Source installation is the stable path. It copies editable files with the
ownership, planning, backup, and rollback guarantees already implemented by
`@damatjs/installer`. Node and Damat package backends are explicitly early
alpha and may change before the first stable package-mode contract.

## Principles

- One filename and schema serves sources and receiving projects.
- A file's role comes from the current operation, not its filename.
- `damat.json` is optional for a receiver; CLI overrides and safe source
  fallbacks keep the installer usable in any project.
- Source and package are install modes. Node and Damat are package backends.
- Mode precedence remains CLI override, manifest default, then `source`.
- Source mode is stable; package mode always requires an explicit alpha opt-in.
- Remote manifests are declarative data and cannot execute hooks or commands.
- Host integration files belong to the user or AI, not the installer.
- No code, test, fixture, script, or generated file exceeds 100 physical lines.

## Universal Manifest

Every application, module, or kit may contain `damat.json` at its root.

```json
{
  "$schema": "https://damat.dev/schemas/damat-v1.json",
  "schemaVersion": 1,
  "kind": "module",
  "name": "user",
  "version": "1.0.0",
  "install": {
    "modes": ["source", "package"],
    "default": "source",
    "packageBackends": ["node", "damat"],
    "provides": {
      "module": { "from": "src/**" },
      "routes": { "from": "routes/**" },
      "workflows": { "from": "workflows/**" }
    }
  },
  "module": {
    "models": "./src/models",
    "migrations": "./src/migrations"
  }
}
```

The core fields are:

- `schemaVersion`: exactly `1`.
- `kind`: `application`, `module`, `kit`, or `package`.
- `name`: lowercase kebab-case identity.
- `version`: optional artifact version.
- `install`: optional bidirectional installation profile.
- `module`: optional Damat runtime metadata, valid for `kind: "module"`.

Unknown fields are rejected. The schema is JSON-only and contains no callback,
script, command, or lifecycle-hook field.

## Provides and Accepts

`install.provides` maps named capabilities to source paths. The receiving
project's `install.accepts` maps the same capability names to destinations.

```json
{
  "schemaVersion": 1,
  "kind": "application",
  "name": "damat-backend",
  "install": {
    "accepts": {
      "module": { "to": "src/modules/{id}" },
      "routes": { "to": "src/api/routes/{id}" },
      "workflows": { "to": "src/workflows/{id}" },
      "jobs": { "to": "src/jobs/{id}" },
      "events": { "to": "src/events/{id}" },
      "pipelines": { "to": "src/pipelines/{id}" },
      "links": { "to": "src/links/{id}" },
      "tests": { "to": "src/tests/modules/{id}" }
    }
  }
}
```

Each provided capability may declare a safe `fallbackTo`. Destination
selection is deterministic:

1. CLI capability override.
2. Matching receiver `accepts` entry.
3. Provider `fallbackTo`.
4. A planning error naming the unmatched capability.

`{id}` is the only destination template variable in this phase. All source and
destination paths must remain relative, cannot traverse parents, and cannot use
backslashes or absolute roots. A manifest may contain both `provides` and
`accepts`, allowing a composed artifact to receive extensions of its own.

## Stable Source Mode

Source mode converts matched capabilities into the generic installer's file
mappings. The installer owns only the files produced by that plan. It records
checksums and provenance in `damat.lock.json`, detects collisions, supports dry
runs, and backs up only confirmed modified owned files during update or remove.

Kit and module source commands use the same engine and differ only in their
profiles. Both accept local paths, directories, Git, registry references, npm
tarballs, and direct tarballs. Origin never determines install mode.

Stable source commands include `add`, `plan`, `list`, `update`, and `remove`.
The same source, manifest, and receiver must produce the same operation plan
regardless of whether the caller is Kit or Module.

## User-Owned Integration

The installer never edits or claims ownership of shared host files, including:

- `damat.config.ts`
- `tsconfig.json`
- `.env` and `.env.example`
- Application route, workflow, job, event, pipeline, and link barrels
- User-authored call sites

`damat.json` may contain declarative add/remove instructions and literal usage
hints. Plans and command results report those instructions with relevant file
locations. Removal scans for known usage tokens and warns before deleting owned
files, but the user or AI performs integration cleanup.

Transaction journals may restore an installer-owned file after failure. They
never make the installer responsible for user-owned integration files.

## Package Mode and Backends

Package mode uses the same artifact identity and `damat.json` contract as
source mode. It adds a second choice, `packageBackend: "node" | "damat"`.
This is an orthogonal field, not a third install mode.

### Node backend: early alpha

The Node backend installs an immutable package reference through the target's
Bun, npm, pnpm, or Yarn adapter. The artifact remains in `node_modules`, updates
run through the selected package manager, and removal releases the installation
record's package ownership. Shared dependencies are removed only after their
last Damat installation owner is gone.

### Damat backend: early alpha

The first Damat backend uses a project-local `.damat/packages` store. Package
artifacts are immutable and selected through `damat.lock.json`; they are not
copied into editable application source. The framework package resolver treats
this location and a Node package specifier through one interface.

The alpha Damat backend accepts self-contained package artifacts. An artifact
with unresolved external runtime dependencies is rejected rather than silently
falling back to `node_modules`. Full recursive dependency resolution, shared
machine storage, native packages, peer dependency policy, binaries, lifecycle
scripts, and complete replacement of `node_modules` belong to the next version.

Both package backends require an explicit alpha flag. A manifest may advertise
package support, but an unsupported explicit backend fails without fallback.

## Module Runtime Metadata

For `kind: "module"`, the optional `module` section replaces the portable
runtime information currently held in `module.json`. It may identify an
optional non-standard entry override, models, migrations, routes, workflows,
jobs, events, pipelines, links, tests, generated types, environment
declarations, module dependencies, pairing hints, author, and registry
metadata. Conventional `index.ts` or `src/index.ts` entries need no field.

`damat module init` generates a provider profile and runtime section.
Backend creation generates an application receiver profile. `damat kit init`
generates a generic provider profile and may add receiver entries when the kit
is itself extensible.

Existing `module.json` and `damat-kit.json` inputs remain readable during the
0.x migration window and are normalized into the universal schema. New
scaffolds write only `damat.json`. Migration guidance records the exact field
mapping and removal timeline before v1.

## CLI Contract

Kit and Module expose consistent installation flags:

```text
--mode source|package
--package-backend node|damat
--target <capability=path>
--dry-run
--yes
--allow-unverified
--allow-scripts
--experimental-package
```

`--package-backend` is valid only with package mode. Package mode without
`--experimental-package` fails before mutation. The source default requires no
experimental flag.

`damat module publish` and its npm-shaped gateway client are removed. Registry
publication will be driven by Git-hosted automation in a later registry phase.

## Errors and Reporting

Planning fails before mutation for malformed manifests, unsafe paths, unmatched
capabilities, unsupported explicit modes or backends, ownership conflicts,
integrity mismatches, rejected registry status, and non-self-contained Damat
packages.

Reports separate four concerns:

- Artifact origin and immutable provenance.
- Selected mode and package backend.
- Owned file or package operations.
- User-owned integration instructions and usage warnings.

Package alpha warnings are always visible in human output and structured
results. They cannot be disabled by a manifest.

## Package Boundaries

- `@damatjs/installer` owns the universal schema, matching, generic plans,
  transactions, locks, package-backend interface, and security policy.
- `@damatjs/cli-kit` owns Kit command presentation and legacy kit conversion.
- `@damatjs/cli-module` owns Module command presentation, Damat's standard
  provider/receiver profiles, and legacy module conversion.
- `@damatjs/framework` owns package-location resolution at runtime, not install
  acquisition or mutation.
- Backend scaffolding owns the default application receiver manifest.

No framework-specific destination is hard-coded inside the generic installer.

## Testing and Exit Gate

Tests must prove:

- One schema parses provider-only, receiver-only, and combined manifests.
- Unknown executable fields and unsafe paths are rejected.
- CLI override, receiver match, provider fallback, and missing-match error use
  the documented precedence.
- One fixture installs through Kit and Module into two different receiver
  layouts with identical ownership and rollback behavior.
- Source add, plan, list, update, and remove preserve modified user work.
- Integration files remain byte-for-byte unchanged and instructions are
  reported for add and remove.
- Legacy manifests normalize deterministically into `damat.json`.
- Module init, Kit init, and backend creation emit valid manifests.
- Node and Damat package backends require alpha opt-in and never silently
  substitute one another.
- Shared Node package references survive until the final owner is removed.
- A self-contained package loads from Node and Damat locations through the same
  framework resolver contract.

Phase 4 exits when stable source-mode Kit and Module commands use one engine,
accept every approved origin, honor manifest/CLI precedence, and safely handle
modified owned files. Package backends may remain early alpha but must be
clearly gated, deterministic within their stated limits, and covered by parity
tests for self-contained artifacts.

## Out of Scope

- Automatic editing or rollback of host integration files.
- A global Damat package store.
- Full npm-compatible dependency resolution without `node_modules`.
- Native package and binary compatibility in the Damat backend.
- Git-triggered registry build and publication automation.
- Stable package-mode compatibility guarantees.
