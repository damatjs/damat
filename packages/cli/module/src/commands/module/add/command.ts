import type { Command } from "@damatjs/cli";
import { handleModuleAdd } from "./handler";
import { moduleInstallOptions } from "../shared";

export const moduleAddCommand: Command = {
  name: "add",
  description: "Install a module from registry, path, Git, npm, or tarball",
  usage: "damat module add <source> [options]",
  examples: [
    "damat module add user-management            # registry ref (DAMAT_MODULE_REGISTRY)",
    "damat module add damatjs/user-management@0.0.1",
    "damat module add ./local/path/to/module-package --allow-unverified",
    "damat module add https://github.com/damatjs/modules.git#main --allow-unverified",
  ],
  options: moduleInstallOptions,
  handler: handleModuleAdd,
};
