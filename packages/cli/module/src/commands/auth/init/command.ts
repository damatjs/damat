import type { Command } from "@damatjs/cli";
import { handleAuthInit } from "./handler";

export const authInitCommand: Command = {
  name: "init",
  description:
    "Scaffold the storage module an auth provider needs (Better Auth); no-op for hosted providers",
  usage: "damat auth init <provider> [--dir <path>] [--force]",
  examples: [
    "damat auth init better-auth      # scaffold src/modules/auth (owned by you)",
    "damat auth init clerk            # hosted — prints that no tables are needed",
  ],
  options: [
    {
      name: "dir",
      alias: "d",
      type: "string",
      description: "Modules directory (default: src/modules)",
      default: "src/modules",
    },
    {
      name: "force",
      alias: "f",
      type: "boolean",
      description: "Overwrite an existing auth storage module",
      default: false,
    },
  ],
  handler: handleAuthInit,
};
