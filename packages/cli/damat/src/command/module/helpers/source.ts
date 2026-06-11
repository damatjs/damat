import { join, resolve, isAbsolute } from "node:path";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import {
  parseModuleRef,
  formatModuleRef,
  resolveRegistryRef,
} from "@damatjs/module";
import type { ResolvedModuleSource } from "./types";

/**
 * Resolve a module source to a local directory.
 *
 * Supported forms:
 * - registry ref:          user, user@0.2.0, damatjs/user@latest
 *                          (resolved through DAMAT_MODULE_REGISTRY)
 * - local path:            ./path/to/module  or  /abs/path
 * - github shorthand:      user/repo  or  user/repo/sub/dir
 * - git url:               https://github.com/user/repo.git (optional #ref)
 */
export async function resolveModuleSource(
  source: string,
  cwd: string,
): Promise<ResolvedModuleSource> {
  // Local path
  const localPath = isAbsolute(source) ? source : resolve(cwd, source);
  if (existsSync(localPath)) {
    return { dir: localPath, cleanup: () => {} };
  }

  // Registry reference — resolve to the indexed source and recurse
  const moduleRef = parseModuleRef(source);
  if (moduleRef) {
    const registrySource = await resolveRegistryRef(moduleRef);
    if (registrySource) {
      return resolveModuleSource(registrySource, cwd);
    }
    // A bare name is unambiguously a registry ref; "a/b" could still be
    // a github shorthand, so only fail early for bare names.
    if (!source.includes("/")) {
      throw new Error(
        `"${formatModuleRef(moduleRef)}" is a registry module reference but no registry ` +
          `knows it — set DAMAT_MODULE_REGISTRY or use a local path / git source.`,
      );
    }
  }

  // Git sources
  let repoUrl: string | null = null;
  let subDir = "";
  let gitRef = "";

  const hashIndex = source.indexOf("#");
  let cleanSource = source;
  if (hashIndex !== -1) {
    gitRef = source.slice(hashIndex + 1);
    cleanSource = source.slice(0, hashIndex);
  }

  if (/^(https?:\/\/|git@)/.test(cleanSource)) {
    repoUrl = cleanSource;
  } else if (/^[\w.-]+\/[\w.-]+(\/.*)?$/.test(cleanSource)) {
    // github shorthand: user/repo[/sub/dir]
    const [user, repo, ...rest] = cleanSource.split("/");
    repoUrl = `https://github.com/${user}/${repo}.git`;
    subDir = rest.join("/");
  }

  if (!repoUrl) {
    throw new Error(
      `Module source "${source}" is neither an existing path nor a recognizable git source`,
    );
  }

  const tempDir = mkdtempSync(join(tmpdir(), "damat-module-"));
  const cloneArgs = ["clone", "--depth", "1"];
  if (gitRef) cloneArgs.push("--branch", gitRef);
  cloneArgs.push(repoUrl, tempDir);

  const result = spawnSync("git", cloneArgs, { stdio: "pipe", encoding: "utf-8" });
  if (result.status !== 0) {
    rmSync(tempDir, { recursive: true, force: true });
    throw new Error(`git clone failed for ${repoUrl}: ${result.stderr?.trim()}`);
  }

  const moduleDir = subDir ? join(tempDir, subDir) : tempDir;
  if (!existsSync(moduleDir)) {
    rmSync(tempDir, { recursive: true, force: true });
    throw new Error(`Path "${subDir}" not found inside ${repoUrl}`);
  }

  return {
    dir: moduleDir,
    cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
  };
}
