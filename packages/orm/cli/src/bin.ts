#!/usr/bin/env bun
import { runCli } from "@damatjs/cli";
import { loadConfig } from "./cli/config/index.js";
import allCommands from "./cli/commands/index.js";

runCli({
  name: "damat-orm",
  version: "0.0.1",
  description: "DamatJS ORM CLI - unified command line interface for codegen and migrations",
  commands: allCommands,
  configLoader: {
    file: "damat.config.ts",
    load: async () => {
      const cfg = await loadConfig();
      return cfg as Record<string, unknown>;
    },
  },
  banner: {
    title: "Damat ORM",
    subtitle: "Database migrations and code generation",
    style: "boxed",
  },
});
