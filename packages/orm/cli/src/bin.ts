#!/usr/bin/env bun
import { runCli, reportError, getExitCode } from "@damatjs/cli";
import { Logger } from "@damatjs/logger";
import { loadModules } from "./cli/utils/load.js";
import allCommands from "./cli/commands/index.js";

runCli({
  name: "damat-orm",
  version: "0.0.1",
  description:
    "DamatJS ORM CLI - unified command line interface for codegen and migrations",
  commands: allCommands,
  configLoader: {
    file: "damat.config.ts",
    load: async (filePath: string) => {
      const modules = await loadModules(filePath);
      return modules as Record<string, unknown>;
    },
  },
  banner: {
    title: "Damat ORM",
    subtitle: "Database migrations and code generation",
    style: "boxed",
  },
}).catch((error) => {
  // Last-resort net so setup/dispatch failures surface a readable error
  // instead of a raw unhandled-rejection dump.
  reportError(new Logger({ timestamp: false }), error, { prefix: "Fatal error" });
  process.exit(getExitCode(error));
});
