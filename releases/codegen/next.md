# @damatjs/codegen Unreleased

> Converts the package into a silent compatibility facade over the two
> code-generation owner packages.

## What changed

`@damatjs/codegen` previously owned pure schema rendering and Damat-specific
filesystem generation. Those implementations now live in
`@damatjs/schema-codegen` and `@damatjs/module-generator`. The package re-exports
both public surfaces and retains its `types` subpath without runtime warnings or
import side effects.

## Changed / improved

- Pure TypeScript and Zod rendering is owned by `@damatjs/schema-codegen`.
- Model discovery, output writes, registries, CRUD scaffolds, and barrels are
  owned by `@damatjs/module-generator`.
- The facade depends only on the two owner packages and contains no generation
  implementation.

## Breaking

- None. Existing root and `types` subpath imports continue to resolve.

## Action required

1. For `ModuleSchema` to TypeScript/Zod generation, replace
   `@damatjs/codegen` with `@damatjs/schema-codegen`.
2. For Damat discovery, registries, scaffolds, or barrels, replace it with
   `@damatjs/module-generator`.
3. Existing imports continue to work during the v1 compatibility window.

## References

- Current behavior:
  [package README](../../packages/core/codegen/README.md) and
  [internals](../../packages/core/codegen/docs/README.md)
- Source: `packages/core/codegen/src/`
