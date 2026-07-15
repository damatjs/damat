import type { Command } from "@damatjs/cli";
import { handleModuleRemove } from "./handler";

export const moduleRemoveCommand: Command = {
  name: "remove",
  description:
    "Remove an installed module from this app (inverse of module add)",
  aliases: ["rm", "uninstall"],
  usage:
    "damat module remove <id> [--dir <path>] [--force] [--clean-env] [--dry-run]",
  examples: [
    "damat module remove user-management",
    "damat module remove user-management --dry-run   # show what would be deleted",
    "damat module remove user-management --force     # even if other modules depend on it",
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
      name: "force",
      alias: "f",
      type: "boolean",
      description:
        "Remove even when other installed modules depend on this one",
      default: false,
    },
    {
      name: "clean-env",
      type: "boolean",
      description:
        "Also remove the module's env block from .env.example (.env is never touched)",
      default: false,
    },
    {
      name: "dry-run",
      type: "boolean",
      description: "Print what would be removed without deleting anything",
      default: false,
    },
  ],
  handler: handleModuleRemove,
};
