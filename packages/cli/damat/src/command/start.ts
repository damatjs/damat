import { spawn } from "bun";
import { join } from "node:path";
import { existsSync } from "node:fs";
import type { Command } from "@damatjs/cli";

export const startCommand: Command = {
  name: "start",
  description: "Start production server",
  aliases: ["s"],
  options: [
    {
      name: "output",
      alias: "o",
      type: "string",
      description: "Output directory",
      default: ".damat/dist",
    },
  ],
  handler: async (ctx) => {
    const outputDir = ctx.options.output as string;
    const distPath = join(ctx.cwd, outputDir, "entry.js");

    if (!existsSync(distPath)) {
      ctx.logger.error("Build not found. Run `damat build` first.");
      return { exitCode: 1 };
    }

    const result = spawn({
      cmd: ["bun", "run", distPath],
      cwd: ctx.cwd,
      stdout: "inherit",
      stderr: "inherit",
      env: { ...process.env, NODE_ENV: "production" },
    });

    const exitCode = await result.exited;
    return { exitCode };
  },
};
