import { join, resolve, isAbsolute, sep } from "node:path";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { parseCloneSource } from "../clone";
import { requireGit } from "../shared/git";

export interface ResolvedKitSource {
  /** Local directory holding the kit (the damat-kit.json root). */
  dir: string;
  /** Remove any temp checkout (no-op for local paths). */
  cleanup: () => void;
  origin: { type: "path" | "git"; ref: string; url: string };
}

/**
 * Resolve a kit source to a local directory: an existing path is used as-is;
 * anything else goes through the same URL / github-shorthand / #ref /
 * subdirectory grammar as `damat clone`, checked out shallow to a temp dir
 * with the user's system git (clear error when git is missing — no fallback).
 */
export function resolveKitSource(source: string, cwd: string): ResolvedKitSource {
  const localPath = isAbsolute(source) ? source : resolve(cwd, source);
  if (existsSync(localPath)) {
    return {
      dir: localPath,
      cleanup: () => {},
      origin: { type: "path", ref: source, url: localPath },
    };
  }

  const parsed = parseCloneSource(source); // throws on unrecognizable sources

  const gitError = requireGit(`add kits from git sources (${parsed.repoUrl})`);
  if (gitError) throw new Error(gitError);

  const tempDir = mkdtempSync(join(tmpdir(), "damat-kit-"));
  const args = ["clone", "--depth", "1"];
  if (parsed.ref) args.push("--branch", parsed.ref);
  args.push("--", parsed.repoUrl, tempDir);
  const result = spawnSync("git", args, { stdio: "pipe", encoding: "utf-8" });
  if (result.error || result.status !== 0) {
    rmSync(tempDir, { recursive: true, force: true });
    throw new Error(
      `git clone failed for ${parsed.repoUrl}: ${result.error?.message ?? result.stderr?.trim() ?? "(no stderr)"}`,
    );
  }

  let kitDir = tempDir;
  if (parsed.subDir) {
    const resolvedSub = resolve(join(tempDir, parsed.subDir));
    if (resolvedSub !== resolve(tempDir) && !resolvedSub.startsWith(resolve(tempDir) + sep)) {
      rmSync(tempDir, { recursive: true, force: true });
      throw new Error(`Subdirectory "${parsed.subDir}" escapes the cloned repository`);
    }
    if (!existsSync(resolvedSub)) {
      rmSync(tempDir, { recursive: true, force: true });
      throw new Error(`Path "${parsed.subDir}" not found inside ${parsed.repoUrl}`);
    }
    kitDir = resolvedSub;
  }

  return {
    dir: kitDir,
    cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
    origin: { type: "git", ref: source, url: parsed.repoUrl },
  };
}
