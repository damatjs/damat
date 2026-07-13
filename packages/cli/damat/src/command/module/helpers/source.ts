import { join, resolve, isAbsolute, sep } from "node:path";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import {
  parseModuleRef,
  formatModuleRef,
  resolveRegistryEntry,
} from "@damatjs/module";
import { requireGit } from "../../shared/git";
import type { ResolvedModuleSource } from "./types";

/**
 * Resolve a module source to a local directory, along with its provenance.
 *
 * Supported forms:
 * - registry ref:          user, user@0.2.0, damatjs/user@latest
 *                          (resolved through DAMAT_MODULE_REGISTRY; carries the
 *                          verifiable owner + verification the registry recorded)
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
    return {
      dir: localPath,
      cleanup: () => {},
      origin: { type: "path", ref: source, url: localPath },
    };
  }

  // Registry reference — resolve to the indexed record, fetch its source, but
  // keep the registry as the recorded origin (owner + verification).
  const moduleRef = parseModuleRef(source);
  if (moduleRef) {
    const record = await resolveRegistryEntry(moduleRef);
    if (record) {
      const inner = await resolveModuleSource(record.source, cwd);
      return {
        ...inner,
        registry: record,
        origin: {
          type: "registry",
          ref: formatModuleRef(moduleRef),
          url: record.source,
          version: record.version,
          owner: record.owner?.namespace,
          verification: record.verification.status,
          integrity: record.integrity,
        },
      };
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

  // Git sources ride on the user's system git — no bundled fallback.
  const gitError = requireGit(`install modules from git sources (${repoUrl})`);
  if (gitError) throw new Error(gitError);

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
  // A `..`-laden subpath (e.g. `user/repo/../../etc`) would resolve outside the
  // temp checkout; refuse anything that escapes it before touching the path.
  const resolvedTemp = resolve(tempDir);
  const resolvedModuleDir = resolve(moduleDir);
  if (
    resolvedModuleDir !== resolvedTemp &&
    !resolvedModuleDir.startsWith(resolvedTemp + sep)
  ) {
    rmSync(tempDir, { recursive: true, force: true });
    throw new Error(`Module subpath "${subDir}" escapes the cloned repository`);
  }
  if (!existsSync(moduleDir)) {
    rmSync(tempDir, { recursive: true, force: true });
    throw new Error(`Path "${subDir}" not found inside ${repoUrl}`);
  }

  return {
    dir: moduleDir,
    cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
    origin: { type: "git", ref: source, url: repoUrl },
  };
}
