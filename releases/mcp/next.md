# @damatjs/mcp Unreleased

> Aligns AI-assisted module discovery with the current install contract.

## Changed

- `list_installed` reads authoritative module records from `damat.lock.json`
  instead of assuming every capability remains under `src/modules`.
- Add, update, and remove tools expose the current transactional installer
  options and no longer issue obsolete directory, force, or env-cleanup flags.
- Tool descriptions and documentation reflect source-mode capability copying
  and backend-owned integration review.
- The build gate now performs a strict source type-check and declares no Turbo
  output because the published MCP server runs directly from TypeScript in Bun.
- The executable entrypoint is exercised as a real stdio JSON-RPC subprocess.

## Breaking

- None.

## Action required

Remove the obsolete `dir`, `name`, `force`, and `cleanEnv` inputs from custom MCP
calls. Use capability `target` overrides, `yes` for modified owned files, and
`dryRun` for inspection.

## References

- Current behavior: [package README](../../packages/mcp/README.md)
- Source: `packages/mcp/src/`
