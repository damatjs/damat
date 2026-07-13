---
"@damatjs/damat-cli": minor
"@damatjs/mcp": minor
"@damatjs/framework": minor
"@damatjs/services": minor
---

Module lifecycle commands and framework/service ergonomics:

- **@damatjs/damat-cli**: new `damat module remove <id>` (inverse of add — deletes the split layout, deregisters from damat.config.ts, drops the tsconfig alias; refuses while other modules depend on it unless `--force`; `--clean-env` removes the module's block from .env.example only) and `damat module update <id>` (re-fetches from the recorded provenance, shows a version + file diff flagging locally modified files, applies with `--yes` through the same verification gates as add). `--dry-run` on add/remove/update prints the full plan without writing anything. Shared `moduleLayoutPaths()` keeps install and remove targets from drifting.
- **@damatjs/mcp**: registry index is cached in-process (60s TTL), fetches have a 10s timeout, and errors distinguish 404 / 5xx / network-unreachable / invalid JSON; malformed registry entries are skipped with a stderr warning instead of reaching the tools. New `remove_module` and `update_module` tools mirror the CLI commands (dry-run first, explicit approval flags).
- **@damatjs/framework**: hono's `ContextVariableMap` is augmented so `c.get("requestId"/"logger"/"user"/"team"/"userId")` is fully typed in apps, with `getRequestLogger(c)`/`getUser(c)`/`getTeam(c)` accessors. New optional bootstrap lifecycle hooks in damat.config.ts (`hooks.beforeServices/afterServices/beforeRoutes/afterRoutes`), each awaited, failing startup when they throw. Fixed: route-handler errors now get the framework's JSON error envelope — Hono v4 routes handler throws to `app.onError`, which was never installed, so they previously returned Hono's plain-text "Internal Server Error".
- **@damatjs/services**: `PoolManager.close()` drains and ends the pg pool idempotently (guards double-end). New opt-in `logQueries` flag on the service config emits one debug-level `query` log ({ model, method, durationMs }) per CRUD call — never SQL text or parameters.
