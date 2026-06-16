[Damat Guide](../GUIDE.md) › Installing modules with AI

# 15. Installing modules with AI (MCP)

[`@damatjs/mcp`](../../packages/mcp/README.md) is a Model Context Protocol server
that lets an AI assistant (Claude Code, Claude Desktop, Cursor, …) discover and
install modules for you. It wraps the registry and the `damat module add` flow
in safe tools.

## Wire it up

This repo ships a ready `.mcp.json`. In your own app, add:

```json
{
  "mcpServers": {
    "damat-modules": {
      "command": "bunx",
      "args": ["damat-mcp"],
      "env": {
        "DAMAT_MODULE_REGISTRY": "https://registry.damatjs.dev/index.json",
        "DAMAT_APP_DIR": ".",
        "DAMAT_CLI": "damat"
      }
    }
  }
}
```

(Inside this monorepo, point `args` at the source:
`"command": "bun", "args": ["run", "packages/mcp/bin/damat-mcp.ts"]`.)

## What the assistant can do

| Tool | Purpose |
|------|---------|
| `search_modules` / `list_modules` | find modules in the registry |
| `module_info` | inspect a module before installing |
| `add_module` | install it (runs `damat module add`) |
| `list_installed` | see what's already in the app |

Then just ask: *"Find a Damat auth module and install it."* The assistant calls
`search_modules → module_info → add_module`, and tells you to run migrations.
Claude Code users also get two skills —
[`damat-modules`](../../.claude/skills/damat-modules/SKILL.md) (install/author
flows) and [`damat-backend`](../../.claude/skills/damat-backend/SKILL.md)
(general backend development). See the
[MCP internals](../../packages/mcp/docs/README.md) to extend the server.

---

Prev: [← Installing existing modules](./14-installing-modules.md) · [Guide home](../GUIDE.md) · Next: [CLI reference →](./16-cli-reference.md)
