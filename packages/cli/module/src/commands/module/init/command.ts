import type { Command } from "@damatjs/cli";
import { databaseSetupOptions } from "@damatjs/cli-support";
import { handleModuleInit } from "./handler";

export const moduleInitCommand: Command = {
  name: "init",
  description: "Scaffold a new standalone module package",
  usage:
    "damat module init <name> [--database-url <url>] [--no-database-setup]",
  options: [
    ...databaseSetupOptions,
    {
      name: "dir",
      alias: "d",
      type: "string",
      description: "Directory to create the package in (default: ./<name>)",
    },
    {
      name: "install",
      type: "boolean",
      default: true,
      description: "Run bun install (use --no-install to defer)",
    },
  ],
  handler: handleModuleInit,
};
