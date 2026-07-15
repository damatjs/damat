import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { extname, relative, resolve } from "node:path";

export interface LineViolation {
  path: string;
  lines: number;
}

const codeExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);
const ignoredDirectories = new Set(["node_modules", "dist", ".git", ".turbo"]);

export function findLineViolations(
  paths: readonly string[],
): LineViolation[] {
  const files = paths.flatMap((path) => collectCodeFiles(resolve(path)));
  return files
    .map((path) => ({ path: relative(process.cwd(), path), lines: count(path) }))
    .filter((entry) => entry.lines > 100)
    .sort((left, right) => left.path.localeCompare(right.path));
}

function collectCodeFiles(path: string): string[] {
  if (!existsSync(path)) return [];
  const stats = statSync(path);
  if (stats.isFile()) return codeExtensions.has(extname(path)) ? [path] : [];
  if (!stats.isDirectory()) return [];

  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) return [];
    if (!entry.isDirectory() && !entry.isFile()) return [];
    return collectCodeFiles(resolve(path, entry.name));
  });
}

function count(path: string): number {
  const content = readFileSync(path, "utf8");
  if (content.length === 0) return 0;
  const lines = content.split(/\r?\n/).length;
  return content.endsWith("\n") ? lines - 1 : lines;
}

if (import.meta.main) {
  const violations = findLineViolations(process.argv.slice(2));
  for (const violation of violations) {
    console.error(`${violation.path}: ${violation.lines} lines (maximum 100)`);
  }
  if (violations.length > 0) process.exitCode = 1;
}
