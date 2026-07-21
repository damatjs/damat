import type { TreeEntry } from "./entries";

export function serializeTreeEntry(entry: TreeEntry): string {
  return `${JSON.stringify([entry.type, entry.path, entry.mode, entry.size, entry.digest])}\n`;
}
