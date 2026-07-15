import type { Command } from "@damatjs/cli";
import { handleModuleAdd } from "./handler";

export const moduleAddCommand: Command = {
  name: "add",
  description:
    "Add a module to this app from the registry, a path, or git (shadcn-style)",
  usage:
    "damat module add <source> [--name <id>] [--dir <path>] [--force] [--allow-unverified] [--allow-scripts] [--dry-run]",
  examples: [
    "damat module add user-management            # registry ref (DAMAT_MODULE_REGISTRY)",
    "damat module add damatjs/user-management@0.0.1",
    "damat module add ./local/path/to/module-package --allow-unverified",
    "damat module add https://github.com/damatjs/modules.git#main --allow-unverified",
  ],
  options: [
    {
      name: "name",
      alias: "n",
      type: "string",
      description: "Override the module id (defaults to manifest name)",
    },
    {
      name: "dir",
      alias: "d",
      type: "string",
      description: "Target modules directory",
      default: "src/modules",
    },
    {
      name: "force",
      alias: "f",
      type: "boolean",
      description: "Overwrite if the target module directory already exists",
      default: false,
    },
    {
      name: "allow-unverified",
      type: "boolean",
      description:
        "Install from a path/git source (no registry verification) and permit file:/git/url dependency ranges",
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
      description:
        "Resolve and validate the module, then print what would be installed without writing anything",
      default: false,
    },
  ],
  handler: handleModuleAdd,
};
