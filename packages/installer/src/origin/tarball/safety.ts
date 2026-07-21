import { resolve, sep } from "node:path";

export function safeArchivePath(rootDir: string, entry: string): string {
  if (
    !entry ||
    entry.includes("\0") ||
    entry.includes("\\") ||
    entry.startsWith("/") ||
    /^[A-Za-z]:/.test(entry)
  ) {
    throw new Error(`unsafe archive path: ${entry}`);
  }
  const parts = entry.split("/").filter((part) => part !== "" && part !== ".");
  if (parts.includes("..")) throw new Error(`unsafe archive path: ${entry}`);
  const target = resolve(rootDir, ...parts);
  const root = resolve(rootDir);
  if (target !== root && !target.startsWith(`${root}${sep}`))
    throw new Error(`archive path escapes root: ${entry}`);
  return target;
}
