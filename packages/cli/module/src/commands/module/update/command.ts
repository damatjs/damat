import type { Command } from "@damatjs/cli";
import { handleModuleUpdate } from "./handler";
import { moduleInstallOptions } from "../shared";

export const moduleUpdateCommand: Command = {
  name: "update",
  description:
    "Re-fetch an installed module from its recorded source and reinstall it",
  aliases: ["up", "upgrade"],
  usage:
    "damat module update <id> [--dir <path>] [--yes] [--allow-unverified] [--allow-scripts] [--dry-run]",
  examples: [
    "damat module update user-management --dry-run   # show what would change",
    "damat module update user-management --yes        # apply (overwrites local edits)",
  ],
  options: moduleInstallOptions,
  handler: handleModuleUpdate,
};
