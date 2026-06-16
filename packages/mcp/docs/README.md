# @damatjs/mcp — internals

Maintainer-facing notes for the Damat module MCP server. Audience: people
changing the server.

## What this is

A single, dependency-free Bun script that implements an
[MCP](https://modelcontextprotocol.io) **server** over the **stdio transport**.
It bridges two things that already exist in Damat:

1. the **module registry** (an index JSON described by
   [`@damatjs/module`](../../module/docs/registry.md)), and
2. the **`damat module add`** command (in
   [`@damatjs/damat-cli`](../../cli/damat/docs/module-commands.md)).

The AI never touches the filesystem directly to install a module — it calls a
tool, the tool runs the audited CLI path, and the CLI does the copy + config
registration + env sync + package install.

## Module map

The server is plain TypeScript run by Bun (no build step). `bin/damat-mcp.ts`
is just the executable entry — it carries the shebang and the env-var reference,
then calls `run()`. Everything else lives under `src/`, split so no file
exceeds ~100 lines:

| Path | Responsibility |
|------|----------------|
| `bin/damat-mcp.ts` | Executable entry: shebang + env-var docs; imports `run` from `src/server` and calls it. |
| `src/constants.ts` | Server identity (`SERVER_NAME`/`SERVER_VERSION`), `DEFAULT_PROTOCOL`, and shared strings (`NO_REGISTRY_MSG`, `SERVER_INSTRUCTIONS`). |
| `src/env.ts` | Config from environment: `appDir()`, `registryLocation()`, `damatCli()`. |
| `src/registry/` | Registry layer — `types.ts` (inline copies of `@damatjs/module` shapes), `ref.ts` (`parseModuleRef`/`formatModuleRef`), `load.ts` (`loadRegistryIndex`/`lookupEntry`), `summarize.ts` (`summarizeEntry`). |
| `src/app/` | The target Damat app — `cli.ts` (`runDamat`, shells out to the CLI) and `installed.ts` (`listInstalled`, scans the modules dir). |
| `src/tools/` | One MCP tool per file (`list-modules`, `search-modules`, `module-info`, `list-installed`, `add-module`), the `ToolDef` type, and `index.ts` assembling the `tools` catalog. |
| `src/server/` | The MCP transport — `rpc.ts` (`send`/`reply`/`replyError`), `dispatch.ts` (`handleMessage`), `run.ts` (the newline-delimited stdin loop). |
| `registry.example.json` | A sample registry index used by the repo's `.mcp.json` and for local testing. |
| `package.json` | Declares the `damat-mcp` bin (raw `.ts`, run by Bun — no build); publishes `bin` + `src`. |

Each folder has an `index.ts` barrel, so imports stay at the folder level
(`from "../registry"`, `from "../tools"`). The dependency direction is
one-way: `server` → `tools` → `registry`/`app` → `env`/`constants`.

## Transport & protocol

- **Transport:** stdio. Each JSON-RPC message is a single UTF-8 line
  terminated by `\n`. `run()` (in `src/server/run.ts`) buffers stdin and splits
  on newlines; malformed lines are ignored.
- **Protocol version:** the server echoes the client's requested
  `protocolVersion` on `initialize`, falling back to `DEFAULT_PROTOCOL`
  (`2025-06-18`).
- **Methods handled:**
  - `initialize` → returns `protocolVersion`, `capabilities.tools`,
    `serverInfo`, and `instructions`.
  - `notifications/initialized` / `initialized` → no-op (notification).
  - `ping` → `{}`.
  - `tools/list` → the tool catalog (name/description/inputSchema).
  - `tools/call` → dispatch to the matching handler; result is wrapped as
    `{ content: [{ type: "text", text }], isError }`.
  - anything else → `-32601 Method not found` (only for requests, not
    notifications).
- **Notifications** (messages with no `id`) never get a response.

Handler errors are caught and returned as `isError: true` tool results (not
JSON-RPC errors) so the assistant sees the message and can recover.

## Tool reference

| Tool | Inputs | Behavior |
|------|--------|----------|
| `list_modules` | — | Loads the registry index, returns a summary per module. Errors if no registry is configured. |
| `search_modules` | `query` | Same, filtered by case-insensitive match on ref/description/keywords. |
| `module_info` | `ref` | `parseModuleRef` → `lookupEntry` (tries `namespace/name` then bare `name`) → summary. |
| `list_installed` | `dir?` (default `src/modules`) | Scans `DAMAT_APP_DIR/<dir>` for subdirectories with a `module.json`. |
| `add_module` | `source`, `name?`, `dir?`, `force?` | Builds `module add` args and runs `runDamat()`. |

`summarizeEntry()` is the single place that decides which registry fields are
surfaced to the model — extend it when you add fields to the registry schema.

## How an install flows

```
assistant → tools/call add_module { source: "damatjs/user" }
  → runDamat(["module", "add", "damatjs/user"])
    → spawnSync(damatCli, ..., { cwd: appDir() })
      → damat CLI: resolve source → verify → copy → register in
        damat.config.ts → sync env → bun add packages
  → tool result: CLI stdout/stderr, isError = (exit != 0)
```

The server adds no policy of its own; the **verification gate** lives in the
CLI/`@damatjs/module` and is controlled by `DAMAT_MODULE_VERIFY`.

## Extending the server

- **New tool:** add `src/tools/<your-tool>.ts` exporting a `ToolDef`, then
  register it in the `tools` array in `src/tools/index.ts`. Give it a precise
  `description` (the model reads it) and a strict `inputSchema`
  (`additionalProperties: false`). Return `{ text, isError? }`.
- **Richer registry output:** edit `summarizeEntry()` in
  `src/registry/summarize.ts` and the inline types in `src/registry/types.ts`
  — keep them in sync with `@damatjs/module/src/registry/entry.ts`.
- **Resources/prompts:** not implemented. If you add them, advertise the
  capability in the `initialize` response (`src/server/dispatch.ts`) and handle
  `resources/list` etc.

## Testing locally

Drive it with a here-doc of newline-delimited JSON-RPC:

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{}}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_modules","arguments":{}}}' \
| DAMAT_MODULE_REGISTRY=packages/mcp/registry.example.json \
  bun run packages/mcp/bin/damat-mcp.ts
```

Each response is one JSON line on stdout. Because handlers are async, responses
may arrive out of request order — match them by `id`.

## Gotchas

- **`damat` must be runnable.** If the bin is not on `PATH`, set `DAMAT_CLI`
  (e.g. `bun /abs/path/packages/cli/damat/src/cli.ts`). `runDamat` returns a
  helpful message when the spawn fails.
- **Never write to stdout except protocol messages.** Any stray `console.log`
  corrupts the stream. Use `process.stderr` for debugging.
- **Registry-less mode is valid.** Without `DAMAT_MODULE_REGISTRY`, the
  registry tools return guidance (with `isError: true`) but `add_module` still
  works for git/path sources.
