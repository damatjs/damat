import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { parseGitSource, requireGit } from "@damatjs/cli-support";
import type { ResolvedModuleSource } from "../types";

export function resolveGitSource(source: string): ResolvedModuleSource {
  let parsed;
  try {
    parsed = parseGitSource(source);
  } catch {
    throw new Error(
      `Module source "${source}" is neither an existing path nor a recognizable git source`,
    );
  }
  const gitError = requireGit(
    `install modules from git sources (${parsed.repoUrl})`,
  );
  if (gitError) throw new Error(gitError);
  const tempDir = mkdtempSync(join(tmpdir(), "damat-module-"));
  const args = ["clone", "--depth", "1"];
  if (parsed.ref) args.push("--branch", parsed.ref);
  args.push(parsed.repoUrl, tempDir);
  const result = spawnSync("git", args, { stdio: "pipe", encoding: "utf-8" });
  if (result.status !== 0) {
    rmSync(tempDir, { recursive: true, force: true });
    throw new Error(
      `git clone failed for ${parsed.repoUrl}: ${result.stderr?.trim()}`,
    );
  }
  const moduleDir = parsed.subDir ? join(tempDir, parsed.subDir) : tempDir;
  const checkout = resolve(tempDir);
  const resolved = resolve(moduleDir);
  if (resolved !== checkout && !resolved.startsWith(checkout + sep)) {
    rmSync(tempDir, { recursive: true, force: true });
    throw new Error(
      `Module subpath "${parsed.subDir}" escapes the cloned repository`,
    );
  }
  if (!existsSync(moduleDir)) {
    rmSync(tempDir, { recursive: true, force: true });
    throw new Error(
      `Path "${parsed.subDir}" not found inside ${parsed.repoUrl}`,
    );
  }
  return {
    dir: moduleDir,
    cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
    origin: { type: "git", ref: source, url: parsed.repoUrl },
  };
}
