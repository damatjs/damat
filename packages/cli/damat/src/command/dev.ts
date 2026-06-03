import { spawn } from "bun";
import { join } from "node:path";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import type { Command } from "@damatjs/cli";

export const devCommand: Command = {
  name: "dev",
  description: "Start development server with hot reload",
  aliases: ["d"],
  options: [
    {
      name: "port",
      alias: "p",
      type: "number",
      description: "Port to run the server on",
      default: 3000,
    },
    {
      name: "clear",
      alias: "c",
      type: "boolean",
      description: "Clear console on start",
      default: false,
    },
  ],
  handler: async (ctx) => {
    const port = ctx.options.port as number;
    const clear = ctx.options.clear as boolean;
    const damatDir = join(ctx.cwd, ".damat");

    if (!existsSync(damatDir)) {
      mkdirSync(damatDir, { recursive: true });
    }

    const tempFile = join(damatDir, "dev-entry.ts");

    writeFileSync(tempFile, `import { runEntry } from '@damatjs/framework/entry';\nrunEntry();\n`);

    clear && console.clear();

    const result = spawn({
      cmd: ["bun", "--watch", "--no-clear-screen", tempFile],
      cwd: ctx.cwd,
      stdout: "inherit",
      stderr: "inherit",
      env: { ...process.env, NODE_ENV: "development", PORT: String(port) },
    });

    const exitCode = await result.exited;

    try {
      if (existsSync(tempFile)) unlinkSync(tempFile);
    } catch { }

    return { exitCode };
  },
};