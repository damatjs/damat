import type { Command } from "@damatjs/cli";
import { handleKitAdd } from "./handler";
import { installOptions } from "../shared";

export const kitAddCommand: Command = {
  name: "add",
  description: "Install a kit from any supported origin",
  usage: "damat kit add <source> [options]",
  examples: [
    "damat kit add acme/design-kit                    # github shorthand",
    "damat kit add acme/mono/kits/auth#main --dry-run # subdirectory + ref, plan only",
    "damat kit add ../shared-kits/emails              # local path",
  ],
  options: installOptions,
  handler: handleKitAdd,
};
