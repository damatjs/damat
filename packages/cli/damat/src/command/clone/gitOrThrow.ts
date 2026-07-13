import { spawnSync } from 'node:child_process';


/** Run git and throw with stderr on failure (clone/fetch class of errors). */
export function gitOrThrow(args: string[], cwd: string): void {
  const result = spawnSync("git", args, { cwd, stdio: "pipe", encoding: "utf-8" });
  if (result.error) {
    // Spawn itself failed (git vanished mid-command / ENOENT) — say so plainly.
    throw new Error(
      `could not run git (${result.error.message}) — is git installed and on PATH?`,
    );
  }
  if (result.status !== 0) {
    throw new Error(`git ${args[0]} failed: ${result.stderr?.trim() || "(no stderr)"}`);
  }
}