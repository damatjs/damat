import type { Command } from "@damatjs/cli";
import { handleModuleRemove } from "./handler";
import { moduleInstallOptions } from "../shared";

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
  options: moduleInstallOptions,
  handler: handleModuleRemove,
};
