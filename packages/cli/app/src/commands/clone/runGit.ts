import { spawnSync } from "node:child_process";

/** Run git; true on exit 0 (post-clone niceties that must not fail the command). */
export function runGit(args: string[], cwd: string): boolean {
  try {
    return (
      spawnSync("git", args, { cwd, stdio: "pipe", encoding: "utf-8" })
        .status === 0
    );
  } catch {
    return false;
  }
}
