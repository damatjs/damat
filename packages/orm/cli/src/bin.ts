#!/usr/bin/env bun
import { runCli } from "./cli/index.js";
import { registerAllCommands } from "./cli/commands/index.js";

registerAllCommands();
await runCli({});
