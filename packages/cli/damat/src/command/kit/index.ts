import type { Command } from "@damatjs/cli";
import { kitAddCommand } from "./add";
import { kitInitCommand } from "./init";
import { kitValidateCommand } from "./validate";

/**
 * Kits are the `module add` idea generalized to EVERY kind of project: any
 * codebase that ships a `damat-kit.json` (what it contains, where each file
 * group belongs in a receiving project, where unknowns go) can be copied into
 * any other project — shadcn-style editable source, not a node_modules link.
 */
export const kitCommand: Command = {
  name: "kit",
  description: "Share and install code between ANY projects via damat-kit.json (shadcn-style)",
  aliases: ["k"],
  subcommands: [kitAddCommand, kitInitCommand, kitValidateCommand],
  handler: async (ctx) => {
    ctx.logger.info(
      [
        "Sharing (inside the source codebase):",
        "  damat kit init [name]     Describe this codebase as a kit (damat-kit.json)",
        "  damat kit validate        Check the manifest + preview file placement",
        "",
        "Consuming (inside any target project):",
        "  damat kit add <source>    Copy a kit in (URL, user/repo[/subdir][#ref], or path)",
        "  damat kit add <source> --dry-run   Show where every file would go first",
      ].join("\n"),
    );
    return { exitCode: 0 };
  },
};

export { kitAddCommand, kitInitCommand, kitValidateCommand };
