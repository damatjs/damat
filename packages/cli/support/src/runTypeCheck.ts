import { spawn } from "bun";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CliLogger } from "@damatjs/cli";

export interface RunTypeCheckOptions {
  cwd: string;
  logger: CliLogger;
  skip?: boolean;
  label?: string;
}

export async function runTypeCheck(opts: RunTypeCheckOptions): Promise<number> {
  if (opts.skip) return 0;
  if (!existsSync(join(opts.cwd, "tsconfig.json"))) {
    opts.logger.info("No tsconfig.json found — skipping type-check");
    return 0;
  }
  opts.logger.info(`Type-checking ${opts.label ?? "project"}...`);
  try {
    const result = spawn({
      cmd: ["bunx", "tsc", "--noEmit"],
      cwd: opts.cwd,
      stdout: "inherit",
      stderr: "inherit",
    });
    const exitCode = await result.exited;
    if (exitCode !== 0) {
      opts.logger.error("Type check failed — aborting build");
    }
    return exitCode;
  } catch {
    opts.logger.error(
      "Could not run the type-checker. Install `typescript` as a dev " +
        "dependency, or pass --no-typecheck to skip.",
    );
    return 1;
  }
}
