# @damatjs/mcp Unreleased

> Bare module refs now work with namespaced-only registry indexes.

## Fixed

- `module_info({ ref: "invoice" })` resolves one unique key such as
  `damatjs/invoice`, including matches declared through entry metadata.
- Multiple namespace matches return an ambiguity error with sorted canonical
  refs instead of choosing a publisher implicitly.
- Exact bare and explicit namespaced keys retain precedence.

## Release

- `@damatjs/mcp` requires a version bump before release.
- Together with the existing standalone-runtime and tooling changes plus the
  core CLI fix, the unpublished branch has an eleven-package version-bump
  union. Do not publish any member independently.

## References

- Current behavior: [MCP tools](../../packages/mcp/README.md)
- Source: `packages/mcp/src/registry/lookup.ts`
