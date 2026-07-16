# @damatjs/module-generator Unreleased

> Establishes the Damat-specific owner for module discovery, generated output,
> CRUD scaffolding, registry declarations, and workflow barrels.

## What changed

Damat module generation previously lived beside pure schema rendering inside
`@damatjs/codegen`. The filesystem and framework-oriented behavior now lives in
`@damatjs/module-generator`, which consumes pure file maps from
`@damatjs/schema-codegen`.

The legacy `@damatjs/codegen` package continues to re-export both package
surfaces for compatibility.

## Added

- Model discovery and schema-to-files orchestration through `runCodegen` and
  `runModuleCodegen`.
- Scaffold-once CRUD steps, workflows, collection routes, and id routes.
- Portable alias import rendering and deterministic recursive barrels.
- App-owned and immutable-package registry declaration renderers.

## Breaking

- None. Existing imports from `@damatjs/codegen` remain available.

## Action required

1. Add `@damatjs/module-generator` to packages that discover Damat models,
   write registries, scaffold CRUD, or rebuild barrels.
2. Replace those imports from `@damatjs/codegen` with
   `@damatjs/module-generator`.
3. Existing facade imports continue to resolve during the v1 compatibility
   window.

## References

- Current behavior:
  [package README](../../packages/module-generator/README.md) and
  [internals](../../packages/module-generator/docs/README.md)
- Source: `packages/module-generator/src/`
