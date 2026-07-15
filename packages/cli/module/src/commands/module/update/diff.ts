import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { MODULE_MANIFEST_FILENAME } from "@damatjs/module";

export interface ModuleDiff {
  added: string[];
  changed: string[];
  removed: string[];
}

export function readInstalledVersion(moduleHome: string): string | null {
  const path = join(moduleHome, MODULE_MANIFEST_FILENAME);
  if (!existsSync(path)) return null;
  try {
    return (JSON.parse(readFileSync(path, "utf-8")).version as string) ?? null;
  } catch {
    return null;
  }
}

export function diffModuleHome(source: string, installed: string): ModuleDiff {
  const skip = new Set([
    "api",
    "workflows",
    "links",
    "tests",
    ".git",
    "node_modules",
  ]);
  const sourceFiles = listFiles(source, skip);
  const installedFiles = existsSync(installed)
    ? listFiles(installed, skip)
    : new Map<string, string>();
  const added: string[] = [],
    changed: string[] = [],
    removed: string[] = [];
  for (const [path, content] of sourceFiles) {
    const previous = installedFiles.get(path);
    if (previous === undefined) added.push(path);
    else if (previous !== content) changed.push(path);
  }
  for (const path of installedFiles.keys())
    if (!sourceFiles.has(path)) removed.push(path);
  return {
    added: added.sort(),
    changed: changed.sort(),
    removed: removed.sort(),
  };
}

function listFiles(root: string, skip: Set<string>): Map<string, string> {
  const files = new Map<string, string>();
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir)) {
      if (
        (!prefix && skip.has(entry)) ||
        entry === ".git" ||
        entry === "node_modules"
      )
        continue;
      const absolute = join(dir, entry);
      const relative = prefix ? `${prefix}${sep}${entry}` : entry;
      if (statSync(absolute).isDirectory()) walk(absolute, relative);
      else files.set(relative, readFileSync(absolute, "utf-8"));
    }
  };
  if (existsSync(root)) walk(root, "");
  return files;
}
