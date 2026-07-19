import type { Command } from "@damatjs/cli";
import { handleBuild } from "./handler";

export const buildCommand: Command = {
  name: "build",
  description: "Build for production",
  aliases: ["b"],
  options: [
    {
      name: "output",
      alias: "o",
      type: "string",
      description: "Output directory",
      default: ".damat/dist",
    },
    {
      name: "target",
      alias: "t",
      type: "string",
      description: "Build target (bun or node)",
      default: "bun",
    },
    {
      name: "minify",
      alias: "m",
      type: "boolean",
      description: "Minify the output",
      default: false,
    },
    {
      name: "typecheck",
      type: "boolean",
      description:
        "Type-check the app before building (use --no-typecheck to skip)",
      default: true,
    },
  ],
  handler: handleBuild,
};
