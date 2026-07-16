# Damat Codegen Package Split Design

**Status:** Approved  
**Phase:** Damat v1 roadmap, Phase 6  
**Primary packages:** `@damatjs/schema-codegen`,
`@damatjs/module-generator`, `@damatjs/cli-codegen`, `@damatjs/codegen`

## Purpose

Phase 6 separates pure schema rendering from Damat-specific generation and
filesystem orchestration. Each concern receives one implementation owner.
`@damatjs/codegen` is deprecated and retained only as a temporary compatibility
facade for external users. No Damat package, including the CLI, may consume it.

## Principles

- Implementation moves into the two new owner packages.
- Internal consumers import the owner package directly.
- Pure schema generation has no framework, CLI, or filesystem dependency.
- Damat module generation consumes pure schema generation.
- Generated output remains deterministic.
- User-edited scaffold-once files are never overwritten.
- Deprecation produces no runtime warning or import side effect.
- Every code, test, fixture, script, and generated file stays within 100 lines.

## Package Ownership

### `@damatjs/schema-codegen`

This package owns the pure `ModuleSchema` to TypeScript source transformation:

- column-to-TypeScript and column-to-Zod conversion;
- enum, relation, row, create, and update type rendering;
- combined TypeScript and Zod generation;
- per-table TypeScript and Zod file rendering;
- deterministic in-memory file maps;
- generation defaults, naming helpers, and public generation types.

Its public generation functions return strings or `Map<string, string>`. It
does not discover models, read or write files, inspect Damat configuration,
generate Damat registries, or scaffold framework code.

The required domain dependency is `@damatjs/orm-type`. Logging uses a small
structural interface with a no-op default so logging does not become a required
runtime dependency.

### `@damatjs/module-generator`

This package owns Damat-specific generation:

- model discovery and `ModuleSchema` construction;
- `runCodegen` and `runModuleCodegen`;
- generated type and registry file writing;
- registry augmentation and service type resolution;
- CRUD step, workflow, route, and validator templates;
- scaffold naming and portable import aliases;
- recursive deterministic barrel generation;
- scaffold-once file protection.

It imports schema rendering from `@damatjs/schema-codegen`. It may depend on
Damat ORM and logger packages needed for discovery and orchestration, but the
dependency direction never reverses.

### `@damatjs/cli-codegen`

This remains the command adapter and owns:

- `damat codegen`;
- `damat barrel`;
- app configuration and module path resolution;
- link augmentation;
- CLI logging, validation, and reporting.

It calls `@damatjs/module-generator` directly. It must not import
`@damatjs/codegen`. When it needs a pure rendering API, it imports
`@damatjs/schema-codegen` directly.

### `@damatjs/codegen`

This package is a deprecated, silent compatibility facade:

- it contains no generation implementation;
- it re-exports the preserved legacy root API from the two owner packages;
- its supported legacy subpaths continue to resolve during the v1 window;
- its README, package metadata, and declarations identify the replacements;
- it never emits a runtime deprecation warning;
- its existing version lineage is not lowered.

The facade exists only for external compatibility. All in-repository runtime,
test, script, and documentation examples move to the actual owner packages,
except compatibility tests and release documentation that explicitly discuss
the deprecated package.

## Dependency Direction

```text
@damatjs/schema-codegen
           ↑
@damatjs/module-generator
           ↑
 @damatjs/cli-codegen

@damatjs/codegen ── re-exports schema-codegen and module-generator
```

No owner package depends on `@damatjs/codegen`. This keeps the facade removable
in a later major release without moving implementation again.

## Generation Semantics

The split does not intentionally alter generated source:

- existing schema fixtures remain byte-for-byte equivalent;
- table, enum, relationship, and input ordering remains stable;
- output filenames and banners remain stable;
- generated types and registries remain replaceable outputs;
- steps, workflows, routes, and related scaffold files are written only when
  missing;
- user-modified scaffold files remain untouched;
- barrel entries are sorted and regenerated deterministically.

Any intentional output correction discovered during the move requires its own
test, documentation, and release-note entry instead of being hidden by fixture
updates.

## Migration of Consumers

- ORM generation and link rendering import `@damatjs/schema-codegen`.
- Module authoring/runtime tooling imports `@damatjs/module-generator`.
- `@damatjs/cli-codegen` imports `@damatjs/module-generator` and, only when
  necessary, `@damatjs/schema-codegen`.
- Tests mock the owner package used by the code under test.
- Damat living documentation teaches the owner packages.
- Compatibility tests alone exercise `@damatjs/codegen`.

The phase exit check includes a repository search proving there are no internal
imports of `@damatjs/codegen` outside its facade and compatibility tests.

## Testing

Tests move with implementation ownership:

- mapping, enum, relation, Zod, and file-map tests live in schema codegen;
- filesystem, registry, scaffold, barrel, and orchestration tests live in the
  module generator;
- command and link-augmentation tests remain in CLI codegen;
- compatibility tests prove legacy exports resolve to the owner functions;
- golden fixtures compare intended output before and after the split;
- scaffold tests modify generated files, rerun generation, and prove those
  files are preserved.

Each task runs focused tests, affected consumer tests, type checks, lint, build,
format checks, and the 100-line checker.

## Delivery Order

1. Create `@damatjs/schema-codegen` and move pure implementation and tests.
2. Create `@damatjs/module-generator` and move Damat generation and tests.
3. Migrate CLI and all other internal consumers to the owner packages.
4. Replace `@damatjs/codegen` implementation with the deprecated facade.
5. Update living documentation, release notes, package indexes, and guide data.
6. Run equivalence, scaffold preservation, dependency-boundary, and full
   regression verification.

## Exit Criteria

Phase 6 is complete when schema codegen has no Damat framework or filesystem
dependency, module generation consumes it directly, CLI and internal packages
do not import the deprecated facade, intended fixtures remain equivalent,
scaffold-once files remain preserved, and all affected checks pass.
