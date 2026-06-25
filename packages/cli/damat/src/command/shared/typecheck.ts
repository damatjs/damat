import { spawn } from "bun";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ILogger } from "@damatjs/logger";

export interface RunTypeCheckOptions {
  /** Directory to type-check (must contain a `tsconfig.json`). */
  cwd: string;
  logger: ILogger;
  /** When true, skip entirely and resolve to 0 (used by `--no-typecheck`). */
  skip?: boolean;
  /** What is being checked, for the log line — e.g. "app" or "module". */
  label?: string;
}

/**
 * Run `tsc --noEmit` over a project so a build fails on any type or compile
 * error in its source — not just on a broken entry bundle.
 *
 * Returns the `tsc` exit code (0 = clean). Resolves to 0 when skipped or when
 * there is no `tsconfig.json`. Resolves to 1 (with a helpful message) when the
 * type-checker cannot be launched, so callers treat that as a build failure.
 */
export async function runTypeCheck(opts: RunTypeCheckOptions): Promise<number> {
  if (opts.skip) return 0;

  if (!existsSync(join(opts.cwd, "tsconfig.json"))) {
    opts.logger.info("No tsconfig.json found — skipping type-check");
    return 0;
  }

  opts.logger.info(`Type-checking ${opts.label ?? "project"}...`);

  try {
    // Mirrors the `typecheck` package script (`tsc --noEmit`); `bunx` resolves
    // the locally installed TypeScript.
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
      "Could not run the type-checker. Install `typescript` as a dev dependency, or pass --no-typecheck to skip.",
    );
    return 1;
  }
}
