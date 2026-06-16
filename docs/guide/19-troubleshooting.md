[Damat Guide](../GUIDE.md) › Troubleshooting

# 19. Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| Server won't start, config error | A module's credentials schema failed validation — check the env vars it declares in `module.json`. |
| `module add` says "no registry knows it" | Set `DAMAT_MODULE_REGISTRY`, or install from a path/git source instead. |
| `module add` refuses to install | Verification policy is `require` and the module isn't `verified`; set `DAMAT_MODULE_VERIFY=warn`, or it's `rejected`/`revoked` (blocked). |
| Migrations not applying | Run `damat-orm migrate:status`; ensure the module is registered in `damat.config.ts`. |
| Redis features no-op / error | `REDIS_URL` not set or `initRedis` not called. |
| MCP `add_module` fails to spawn | `damat` not on PATH — set `DAMAT_CLI` in `.mcp.json` env. |

Building Damat itself (not an app on top of it)? Each package's `docs/` folder
is the maintainer guide, and [AGENTS.md](../../AGENTS.md) is the map for working
in this repo.

---

Prev: [← Package reference](./18-package-reference.md) · [Guide home](../GUIDE.md)
