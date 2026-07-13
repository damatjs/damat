import { join, resolve, sep } from "node:path";
import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { gitOrThrow } from "./gitOrThrow";

/** Shallow-clone to a temp dir and copy `subDir` out (minus VCS/deps dirs). */
export function cloneSubdir(
  repoUrl: string,
  subDir: string,
  targetDir: string,
  ref: string,
): void {
  const tempDir = mkdtempSync(join(tmpdir(), "damat-clone-"));
  try {
    const args = ["clone", "--depth", "1"];
    if (ref) args.push("--branch", ref);
    args.push("--", repoUrl, tempDir);
    gitOrThrow(args, tempDir);

    // A `..`-laden subpath would resolve outside the checkout — refuse it.
    const resolvedTemp = resolve(tempDir);
    const resolvedSub = resolve(join(tempDir, subDir));
    if (
      resolvedSub !== resolvedTemp &&
      !resolvedSub.startsWith(resolvedTemp + sep)
    ) {
      throw new Error(`Subdirectory "${subDir}" escapes the cloned repository`);
    }
    if (!existsSync(resolvedSub)) {
      throw new Error(`Path "${subDir}" not found inside ${repoUrl}`);
    }

    cpSync(resolvedSub, targetDir, {
      recursive: true,
      filter: (src) =>
        !src.includes(`${sep}.git${sep}`) &&
        !src.endsWith(`${sep}.git`) &&
        !src.includes(`${sep}node_modules${sep}`) &&
        !src.endsWith(`${sep}node_modules`),
    });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
