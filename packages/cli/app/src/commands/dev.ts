import { spawn } from "bun";
import { join } from "node:path";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import type { Command } from "@damatjs/cli";
import { cleanupTempFile } from "@damatjs/cli-support";

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

    writeFileSync(
      tempFile,
      `import { runEntry } from '@damatjs/framework/entry';\nrunEntry();\n`,
    );

    if (clear) console.clear();

    const { loadEnv } = await import("@damatjs/load-env");
    loadEnv(process.env.NODE_ENV || "development", process.cwd());

    const result = spawn({
      cmd: ["bun", "--watch", "--no-clear-screen", tempFile],
      cwd: ctx.cwd,
      stdout: "inherit",
      stderr: "inherit",
      env: { ...process.env, PORT: process.env.PORT ?? String(port) },
    });

    const exitCode = await result.exited;

    cleanupTempFile(tempFile, ctx.logger);

    return { exitCode };
  },
};
