import { spawn } from "bun";
import { join } from "node:path";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import type { Command } from "@damatjs/cli";
import { cleanupTempFile } from "@damatjs/cli-support";

export const moduleDevCommand: Command = {
  name: "dev",
  description: "Run this module package standalone with hot reload",
  usage: "damat module dev [--port <port>]",
  options: [
    {
      name: "port",
      alias: "p",
      type: "number",
      description: "Port to run the module server on",
    },
  ],
  handler: async (ctx) => {
    const damatDir = join(ctx.cwd, ".damat");
    if (!existsSync(damatDir)) {
      mkdirSync(damatDir, { recursive: true });
    }

    const entryFile = join(damatDir, "module-dev-entry.ts");
    writeFileSync(
      entryFile,
      `import { runModuleEntry } from '@damatjs/module';\nrunModuleEntry();\n`,
    );

    const { loadEnv } = await import("@damatjs/load-env");
    loadEnv(process.env.NODE_ENV || "development", ctx.cwd);

    const port = ctx.options.port as number | undefined;
    const result = spawn({
      cmd: ["bun", "--watch", "--no-clear-screen", entryFile],
      cwd: ctx.cwd,
      stdout: "inherit",
      stderr: "inherit",
      env: {
        ...process.env,
        ...(port !== undefined ? { PORT: String(port) } : {}),
      },
    });

    const exitCode = await result.exited;

    cleanupTempFile(entryFile, ctx.logger);

    return { exitCode };
  },
};
