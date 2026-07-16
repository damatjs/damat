import type { Command } from "@damatjs/cli";
import { kitAddCommand } from "./add";
import { kitInitCommand } from "./init";
import { kitValidateCommand } from "./validate";
import { kitPlanCommand } from "./plan";
import { kitListCommand } from "./list";
import { kitUpdateCommand } from "./update";
import { kitRemoveCommand } from "./remove";

/**
 * Kits are the `module add` idea generalized to EVERY kind of project: any
 * codebase that ships a provider `damat.json` can be installed into a receiver
 * profile as editable source or through an explicitly experimental package backend.
 */
export const kitCommand: Command = {
  name: "kit",
  description: "Share and install code between projects via damat.json",
  aliases: ["k"],
  subcommands: [
    kitAddCommand,
    kitPlanCommand,
    kitListCommand,
    kitUpdateCommand,
    kitRemoveCommand,
    kitInitCommand,
    kitValidateCommand,
  ],
  handler: async (ctx) => {
    ctx.logger.info(
      [
        "Sharing (inside the source codebase):",
        "  damat kit init [name]     Describe this codebase as a kit (damat.json)",
        "  damat kit validate        Check the provider profile",
        "",
        "Consuming (inside any target project):",
        "  damat kit plan <source>   Preview a kit installation",
        "  damat kit add <source>    Install from registry, Git, npm, tarball, or path",
      ].join("\n"),
    );
    return { exitCode: 0 };
  },
};

export {
  kitAddCommand,
  kitPlanCommand,
  kitListCommand,
  kitUpdateCommand,
  kitRemoveCommand,
  kitInitCommand,
  kitValidateCommand,
};
