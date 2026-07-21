import { spawnSync } from "node:child_process";

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

export function requireGit(what: string): string | null {
  if (gitAvailable()) return null;
  return (
    `git is required to ${what} but was not found on PATH — ` +
    "install git and re-run (the damat CLI uses your system git; " +
    "it never installs its own)"
  );
}
