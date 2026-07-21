import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";
import { findLineViolations } from "./check-code-lines";

type GitRunner = (args: readonly string[], cwd: string) => string;

const codeExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const runGit: GitRunner = (args, cwd) =>
  execFileSync("git", args, { cwd, encoding: "utf8" });

export function collectChangedCodePaths(
  baseRevision: string,
  cwd = process.cwd(),
  git: GitRunner = runGit,
): string[] {
  const changed = git(
    ["diff", "--name-only", "--diff-filter=ACMR", "-z", baseRevision, "--"],
    cwd,
  );
  const untracked = git(
    ["ls-files", "--others", "--exclude-standard", "-z"],
    cwd,
  );

  return [...new Set([...parsePaths(changed), ...parsePaths(untracked)])]
    .filter((path) => isExistingCodeFile(resolve(cwd, path)))
    .sort();
}

function parsePaths(output: string): string[] {
  return output.split("\0").filter(Boolean);
}

function isExistingCodeFile(path: string): boolean {
  return (
    existsSync(path) &&
    statSync(path).isFile() &&
    codeExtensions.has(extname(path))
  );
}

if (import.meta.main) {
  const baseRevision = process.argv[2];
  if (!baseRevision) {
    console.error("Usage: bun scripts/check-changed-code-lines.ts <base>");
    process.exit(2);
  }

  const paths = collectChangedCodePaths(baseRevision);
  const violations = findLineViolations(paths);
  for (const violation of violations) {
    console.error(`${violation.path}: ${violation.lines} lines (maximum 100)`);
  }
  if (violations.length > 0) process.exitCode = 1;
}
