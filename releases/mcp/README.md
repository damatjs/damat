# @damatjs/mcp — release notes

Change history for this package. For how it works **now**, read the
[package README](../../packages/mcp/README.md) and its
[docs](../../packages/mcp/docs/).

| Version       | Summary                                                                                                                                                                                                   | Upgrade notes               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 1.0.0-beta.0  | MCP tools read `damat.lock.json` and expose the current transactional install/update/remove contract                                                                                                      | [next →](./1.0.0-beta.0.md) |
| 0.6.0         | `add_module` exposes the CLI security gates (`allowUnverified`, `allowScripts`); flags forwarded only when explicitly true                                                                                | [0.6.0 →](./0.6.0.md)       |
| 0.5.0         | Test coverage to 100%; `readServerVersion(url)` extracted for testability — no tool-surface change                                                                                                        | —                           |
| 0.2.0 – 0.4.1 | Lockstep bumps — no change to the MCP server                                                                                                                                                              | —                           |
| 0.1.4         | `SERVER_VERSION` now derives from package.json (no more drift).                                                                                                                                           | [0.1.4 →](./0.1.4.md)       |
| 0.1.3         | Dependency/version bump only — no change to the MCP server (monorepo-wide bump alongside `@damatjs/link`).                                                                                                | —                           |
| 0.1.2         | Dependency/version bump only — no change to the MCP server (monorepo-wide bump).                                                                                                                          | —                           |
| 0.1.1         | Maintenance — CI/test workflow cleanup; no change to the MCP server.                                                                                                                                      | —                           |
| 0.1.0         | First published release: the Damat module MCP server — `list_modules`, `search_modules`, `module_info`, `list_installed`, `add_module` over stdio JSON-RPC, shelling out to the `damat` CLI for installs. | [0.1.0 →](./0.1.0.md)       |
