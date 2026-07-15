import { spawnSync } from "node:child_process";
import type { CliLogger } from "@damatjs/cli";
import { gitAvailable } from "@damatjs/cli-support";

function run(cmd: string, args: string[], cwd: string): boolean {
  try {
    return spawnSync(cmd, args, {
      cwd,
      stdio: "pipe",
      encoding: "utf-8",
    }).status === 0;
  } catch {
    return false;
  }
}

export function initializeGit(target: string, logger: CliLogger): void {
  if (!gitAvailable()) {
    logger.warn(
      "git is not installed — skipped repository init (run `git init` after installing git)",
    );
    return;
  }
  const ok =
    run("git", ["init", "-b", "main"], target) &&
    run("git", ["add", "."], target) &&
    run("git", ["commit", "-m", "chore: scaffold damat app"], target);
  if (ok) {
    logger.success("Initialized git repository");
  } else {
    logger.warn("Could not initialize git — run `git init` yourself when ready");
  }
}

export function installDependencies(
  target: string,
  name: string,
  logger: CliLogger,
): void {
  logger.info("Installing dependencies (bun install)...");
  if (run("bun", ["install"], target)) {
    logger.success("Dependencies installed");
  } else {
    logger.warn(
      `bun install failed — run it manually in ${name}/ (the scaffold itself is complete)`,
    );
  }
}
