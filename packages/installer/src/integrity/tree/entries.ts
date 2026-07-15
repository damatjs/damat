import { lstatSync, readFileSync, readdirSync, readlinkSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { hashBytes } from "../bytes";

export interface TreeEntry {
  path: string;
  type: "directory" | "file" | "link";
  mode: number;
  size: number;
  digest: string;
}

const IGNORED = new Set([".git", "node_modules"]);

function normalizedMode(path: string, type: TreeEntry["type"]): number {
  if (type === "directory") return 0o755;
  if (type === "link") return 0o777;
  return lstatSync(path).mode & 0o111 ? 0o755 : 0o644;
}

function entry(root: string, path: string): TreeEntry {
  const stat = lstatSync(path);
  const name = relative(root, path).split("\\").join("/") || basename(path);
  const type = stat.isDirectory()
    ? "directory"
    : stat.isSymbolicLink()
      ? "link"
      : "file";
  const value =
    type === "file"
      ? readFileSync(path)
      : type === "link"
        ? Buffer.from(readlinkSync(path))
        : new Uint8Array();
  return {
    path: name,
    type,
    mode: normalizedMode(path, type),
    size: value.length,
    digest: hashBytes(value),
  };
}

function walk(root: string, directory: string, output: TreeEntry[]): void {
  for (const name of readdirSync(directory).sort()) {
    if (IGNORED.has(name)) continue;
    const path = join(directory, name);
    const current = entry(root, path);
    output.push(current);
    if (current.type === "directory") walk(root, path, output);
  }
}

export function collectTreeEntries(root: string): TreeEntry[] {
  const stat = lstatSync(root);
  if (!stat.isDirectory()) return [entry(root, root)];
  const output: TreeEntry[] = [];
  walk(root, root, output);
  return output.sort((left, right) => left.path.localeCompare(right.path));
}
