[Damat Guide](../GUIDE.md) › Installing modules with AI

# 15. Installing modules with AI (MCP)

[`@damatjs/mcp`](../../packages/mcp/README.md) is a Model Context Protocol server
that lets an AI assistant (Claude Code, Claude Desktop, Cursor, …) discover and
install modules for you. It wraps the registry and the `damat module add` flow
in safe tools — the assistant can never do more than the CLI would let you do.

## Wire it up

Add the server to your assistant's MCP config (e.g. `.mcp.json` in your app):

```json
{
  "mcpServers": {
    "damat-modules": {
      "command": "bunx",
      "args": ["damat-mcp"],
      "env": {
        "DAMAT_MODULE_REGISTRY": "https://registry.damatjs.com/index.json",
        "DAMAT_APP_DIR": ".",
        "DAMAT_CLI": "damat"
      }
    }
  }
}
```

The three env vars:

| Variable                | Meaning                                                        | Default                                        |
| ----------------------- | -------------------------------------------------------------- | ---------------------------------------------- |
| `DAMAT_MODULE_REGISTRY` | Registry index — a URL, a `registry.json` path, or a directory | _(unset — discovery tools report no registry)_ |
| `DAMAT_APP_DIR`         | The app the assistant installs into                            | current directory                              |
| `DAMAT_CLI`             | How to invoke the CLI                                          | `damat`                                        |

## The tools

| Tool             | Purpose                                            | Key inputs                                                                        |
| ---------------- | -------------------------------------------------- | --------------------------------------------------------------------------------- |
| `list_modules`   | List everything in the registry                    | —                                                                                 |
| `search_modules` | Find modules by keyword                            | `query`                                                                           |
| `module_info`    | Inspect one module — versions, owner, verification | `ref`                                                                             |
| `list_installed` | What's already in the app                          | —                                                                                 |
| `add_module`     | Install (runs `damat module add`)                  | `source`, plus optional `name`, `dir`, `force`, `allowUnverified`, `allowScripts` |

`add_module` honors the same trust gate as the CLI: unverified path/git sources
need an explicit `allowUnverified: true`, and registry verification follows
your `DAMAT_MODULE_VERIFY` policy (see
[Installing modules](./14-installing-modules.md)).

## Using it

Just ask: _"Find a Damat auth module and install it."_ The assistant chains
`search_modules → module_info → add_module`, reports what changed
(`damat.config.ts` entry, synced env keys), and reminds you to apply
migrations:

```bash
bun damat-orm migrate:up
```

To extend the server with your own tools, see the
[MCP internals](../../packages/mcp/docs/README.md).

---

Prev: [← Publishing modules](./14b-publishing-modules.md) · [Guide home](../GUIDE.md) · Next: [Module capabilities →](./16-module-capabilities.md)
