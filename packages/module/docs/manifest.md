# Manifest internals

The public contract is [MODULES.md](../../../MODULES.md). This page maps that
contract to `@damatjs/module` implementation ownership.

## Universal envelope

`@damatjs/installer` parses the strict universal fields:

```ts
interface DamatManifest {
  $schema?: string;
  schemaVersion: 1;
  kind: "application" | "module" | "kit" | "package";
  name: string;
  version?: string;
  install?: DamatInstallProfile;
  module?: Record<string, unknown>;
}
```

Unknown top-level, install, capability, and module keys are rejected. Manifest
fields are data only; executable configuration is not supported.

## Install profile

The installer owns parsing for:

- source/package modes and package backends;
- provider `provides` and receiver `accepts` mappings;
- package dependencies and ignored paths;
- usage hints;
- advisory add/remove instructions.

`@damatjs/module` consumes the normalized universal manifest and maps the
module-specific object into `ModuleManifest`.

## Module normalization

Accepted module metadata includes identity/description, author, environment,
registry metadata, hard dependencies, pairing hints, and paths for:

- entry, models, migrations, and types;
- routes and workflows;
- jobs, events, and pipelines;
- links and tests.

`resolveModuleEntry` uses an explicit entry when present, then conventional
root and `src/` entry files. `DEFAULT_MODULE_PATHS` supplies conventional paths
for module-local runtimes and tooling.

## Reading and locating

`readModuleManifest(moduleDir)` reads the root `damat.json`, validates the
universal envelope, and normalizes module metadata. Artifact resolution can
locate a module at a source directory, Node package location, or Damat package
store location.

## Ownership boundary

The manifest describes owned files and advisory integration. Installing or
removing a module does not edit shared host config, aliases, environment files,
barrels, or call sites. The installation report carries that work to the user or
AI assembling the backend.

## Extension checklist

When adding a manifest capability:

1. update the installer types and strict schema;
2. update module normalization and path types when runtime-facing;
3. update provider/receiver scaffold profiles;
4. update planning, installation, update, and removal tests;
5. update [MODULES.md](../../../MODULES.md), package docs, guide, and release notes.
