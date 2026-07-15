import type { Command } from "@damatjs/cli";
import { handleKitAdd } from "./handler";

export const kitAddCommand: Command = {
  name: "add",
  description: "Copy a shared kit (any codebase with a damat-kit.json) into this project",
  usage: "damat kit add <source> [--force] [--dry-run] [--no-install] [--allow-scripts]",
  examples: [
    "damat kit add acme/design-kit                    # github shorthand",
    "damat kit add acme/mono/kits/auth#main --dry-run # subdirectory + ref, plan only",
    "damat kit add ../shared-kits/emails              # local path",
  ],
  options: [
    { name: "force", alias: "f", type: "boolean", description: "Overwrite files that already exist in the target (default: skip them)", default: false },
    { name: "dry-run", type: "boolean", description: "Print where every file would go without writing anything", default: false },
    { name: "install", type: "boolean", description: "Install the kit's npm packages via bun add (use --no-install to skip)", default: true },
    { name: "allow-scripts", type: "boolean", description: "Run dependency lifecycle scripts during bun add (skipped by default)", default: false },
  ],
  handler: handleKitAdd,
};
