import type { Command } from "@damatjs/cli";
import { handleModuleInit } from "./handler";

export const moduleInitCommand: Command = {
  name: "init",
  description: "Scaffold a new standalone module package",
  usage: "damat module init <name> [--dir <path>]",
  options: [
    {
      name: "dir",
      alias: "d",
      type: "string",
      description: "Directory to create the package in (default: ./<name>)",
    },
  ],
  handler: handleModuleInit,
};
