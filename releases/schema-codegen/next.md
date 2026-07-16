# @damatjs/schema-codegen Unreleased

> Establishes a pure package boundary for deterministic TypeScript and Zod
> generation from serialized Damat module schemas.

## What changed

The schema rendering core previously lived inside `@damatjs/codegen` beside
filesystem orchestration and CRUD scaffolding. It now has a dedicated package,
`@damatjs/schema-codegen`, whose only runtime dependency is
`@damatjs/orm-type`.

The package consumes `ModuleSchema` values and returns source strings or
in-memory file maps. It performs no model discovery, filesystem writes,
framework integration, or database access. `@damatjs/codegen` re-exports the
same pure API while it continues to own application orchestration and
scaffolding.

## Added

- TypeScript and Zod column mapping, fragment renderers, combined generators,
  per-table generators, and deterministic file-map generation.
- Enum, relation, naming, row, mutation, query, identity, and params helpers
  exported from the package root.
- An optional structural logger using only `debug` and `info`.

## Breaking

- None. Existing pure imports from `@damatjs/codegen` remain available through
  its compatibility re-export.

## Action required

None — existing consumers can continue importing from `@damatjs/codegen`.
Consumers that only need pure schema rendering may depend directly on
`@damatjs/schema-codegen`.

## References

- Current behavior:
  [package README](../../packages/core/schema-codegen/README.md) and
  [internals](../../packages/core/schema-codegen/docs/README.md)
- Source: `packages/core/schema-codegen/src/`
