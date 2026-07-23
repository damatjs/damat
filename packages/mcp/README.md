# @damatjs/mcp

> A Model Context Protocol (MCP) server that lets an AI assistant discover and install Damat modules.

`@damatjs/mcp` exposes the Damat **module registry** and the **`damat module`
CLI** to any MCP client (Claude Code, Claude Desktop, Cursor, …). With it
connected, an assistant can search a registry for an existing module, inspect
it, and install its declared capabilities into your app. Source installs leave
shared configuration, environment values, and call-site wiring to the backend
owner and return an integration report for review.

It is intentionally **dependency-free at runtime**: it speaks the MCP stdio
transport (newline-delimited JSON-RPC 2.0) directly and shells out to the
`damat` CLI for the actual install. Run it with Bun; the repository build gate
strictly type-checks the published source without transpiling it.

Part of the [Damat](../../README.md) monorepo · [Full guide](../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

The server runs straight from source with Bun:

```bash
bun run packages/mcp/bin/damat-mcp.ts
```

Inside a generated Damat app, add it as a dependency and use the `damat-mcp` bin:

```bash
bun add -D @damatjs/mcp
```

## Quick start (Claude Code)

Add an `.mcp.json` to your project root (this repo already ships one):

```json
{
  "mcpServers": {
    "damat-modules": {
      "command": "bun",
      "args": ["run", "packages/mcp/bin/damat-mcp.ts"],
      "env": {
        "DAMAT_MODULE_REGISTRY": "https://registry.damatjs.com/index.json",
        "DAMAT_APP_DIR": ".",
        "DAMAT_CLI": "damat"
      }
    }
  }
}
```

In a published app, point `args` at the installed bin instead:

```json
{ "command": "bunx", "args": ["damat-mcp"] }
```

Then ask your assistant: _"Find a Damat auth module and install it."_ It will
call `search_modules` → `module_info` → `add_module`, then tell you to run
migrations.

## Tools

| Tool             | What it does                                                                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_modules`   | List every module in the configured registry (ref, description, latest version, verification, owner).                                                     |
| `search_modules` | Filter the registry by a query matched against ref, description and keywords.                                                                             |
| `module_info`    | Full registry details for one ref (for example `user` or `damatjs/user@0.2.0`) — read before installing.                                                  |
| `list_installed` | Read authoritative module installation records from `damat.lock.json`, including distributed source capabilities.                                         |
| `add_module`     | Install a registry, path, Git, npm, or tarball source with the transactional installer. Security and experimental package modes require explicit opt-ins. |
| `remove_module`  | Plan or remove installer-owned files and uniquely owned packages. Modified owned files require `yes: true`; database migrations are not rolled back.      |
| `update_module`  | Re-fetch the origin recorded in `damat.lock.json`, show the owned-file plan, and apply after explicit confirmation where needed.                          |

Installs are default-deny for anything a registry has not verified: the
assistant must set `allowUnverified` explicitly (after the user approved that
exact source) before a git/path install proceeds, and `bun add` runs with
`--ignore-scripts` unless `allowScripts` is set.

## Configuration

All configuration is via environment variables (set them in `.mcp.json` → `env`):

| Variable                | Default         | Description                                                                                                                                                                                                       |
| ----------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DAMAT_MODULE_REGISTRY` | —               | Registry index location: an http(s) URL to the index JSON, a path to a `registry.json`, or a directory containing one. Without it, registry tools return guidance and you can still install from git/local paths. |
| `DAMAT_APP_DIR`         | `process.cwd()` | Working directory of the target app. Installs and `damat.lock.json` reads run here.                                                                                                                               |
| `DAMAT_CLI`             | `damat`         | Command used to invoke the CLI. May include args, e.g. `bun /abs/packages/cli/damat/src/cli.ts`.                                                                                                                  |
| `DAMAT_MODULE_VERIFY`   | `warn`          | Forwarded to the CLI: `off` \| `warn` \| `require` — the install-time verification policy.                                                                                                                        |

A sample registry index is provided in
[`registry.example.json`](./registry.example.json). The registry schema matches
[`@damatjs/module`'s registry entry types](../module/docs/registry.md).
For a bare `module_info` ref, an exact bare key wins; otherwise the server
resolves one unique namespaced key or matching entry name. Multiple namespace
matches return an ambiguity error listing the canonical refs to choose from.

## How it fits

- **Depends on:** nothing at runtime. It reads the registry index itself and
  invokes the `damat` CLI (`@damatjs/damat-cli`) for installs.
- **Built on:** the same module contract as
  [`@damatjs/module`](../module/README.md) — registry refs, the `damat.json`
  manifest, and the verification gate.

## Documentation

- [Internals](./docs/README.md) — protocol, tools, and how to extend the server.
- [Damat Guide → Installing modules with AI](../../docs/GUIDE.md) — the end-to-end workflow.

## License

MIT
