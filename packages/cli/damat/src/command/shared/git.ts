import { spawnSync } from "node:child_process";

/**
 * The damat CLI is a thin overlay over the git the user already has — it
 * never bundles or downloads a replacement. These helpers make the
 * git-missing case a single clear error instead of a vague spawn failure.
 */

/** True when a working `git` binary is on PATH. */
export function gitAvailable(): boolean {
  try {
    const result = spawnSync("git", ["--version"], {
      stdio: "pipe",
      encoding: "utf-8",
    });
    return !result.error && result.status === 0;
  } catch {
    return false;
  }
}

/**
 * The error message to show when git is needed but absent — null when git is
 * available. `what` completes the sentence: requireGit("clone repositories").
 */
export function requireGit(what: string): string | null {
  if (gitAvailable()) return null;
  return (
    `git is required to ${what} but was not found on PATH — ` +
    `install git and re-run (the damat CLI uses your system git; it never installs its own)`
  );
}
