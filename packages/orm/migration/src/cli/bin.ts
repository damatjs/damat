#!/usr/bin/env bun
/**
 * damat-migrate
 *
 * CLI binary entry point.
 * Reads command from process.argv[2] and delegates to runCli().
 *
 * Usage:
 *   damat-migrate [command] [args...]
 *
 * Commands:
 *   up              Run all pending migrations (default)
 *   status [module] Show migration status
 *   create <module> Create a new migration for a module
 *   revert <module> [count|--all]  Revert last N migrations
 *   list            List all modules with migrations
 *   help            Show help text
 */

import { runCli } from "./index.js";

await runCli({});
