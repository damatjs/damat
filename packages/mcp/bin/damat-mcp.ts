#!/usr/bin/env bun
/**
 * damat-mcp — a Model Context Protocol (MCP) server for installing and
 * inspecting Damat modules.
 *
 * It exposes the Damat module registry + the `damat module` CLI to any MCP
 * client (Claude Code, Claude Desktop, Cursor, …) so an AI assistant can:
 *   - discover modules published in a registry            (list_modules / search_modules)
 *   - read a module's details before installing it        (module_info)
 *   - install an existing module into a Damat app         (add_module)
 *   - see what is already installed                        (list_installed)
 *
 * It is intentionally DEPENDENCY-FREE: it speaks the MCP stdio transport
 * (newline-delimited JSON-RPC 2.0) directly and shells out to the `damat`
 * CLI for the actual install. Run it with Bun — no build step required.
 *
 * This file is only the executable entry point; the implementation lives in
 * ../src (see src/server, src/tools, src/registry, src/app).
 *
 * Configuration (environment variables):
 *   DAMAT_MODULE_REGISTRY  Registry index location: an http(s) URL to the
 *                          index JSON, a path to a registry.json file, or a
 *                          directory containing registry.json. Without it,
 *                          registry tools return guidance and you can still
 *                          install from git/local paths via add_module.
 *   DAMAT_APP_DIR          Working directory of the target Damat app
 *                          (defaults to process.cwd()). Installs and
 *                          "installed" scans run here.
 *   DAMAT_CLI              Command used to invoke the damat CLI
 *                          (default: "damat"). May contain arguments, e.g.
 *                          "bun /abs/path/packages/cli/damat/src/cli.ts".
 *   DAMAT_MODULE_VERIFY    Forwarded to the CLI: off | warn | require.
 */

import { run } from "../src/server";

run();
