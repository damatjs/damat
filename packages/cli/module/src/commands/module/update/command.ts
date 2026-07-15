import type { Command } from "@damatjs/cli";
import { handleModuleUpdate } from "./handler";

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
  options: [
    {
      name: "dir",
      alias: "d",
      type: "string",
      description: "Modules directory the module was installed into",
      default: "src/modules",
    },
    {
      name: "yes",
      alias: "y",
      type: "boolean",
      description:
        "Apply the update (required — updating overwrites local edits to installed files)",
      default: false,
    },
    {
      name: "allow-unverified",
      type: "boolean",
      description:
        "Allow updating from a recorded path/git source (no registry verification)",
      default: false,
    },
    {
      name: "allow-scripts",
      type: "boolean",
      description:
        "Run dependency lifecycle scripts during bun add (skipped by default)",
      default: false,
    },
    {
      name: "dry-run",
      type: "boolean",
      description: "Show the version and file changes without writing anything",
      default: false,
    },
  ],
  handler: handleModuleUpdate,
};
