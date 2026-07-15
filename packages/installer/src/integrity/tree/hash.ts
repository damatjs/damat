import { createHash } from "node:crypto";
import { collectTreeEntries } from "./entries";
import { serializeTreeEntry } from "./serialize";

export function hashTree(rootDir: string): string {
  const hash = createHash("sha256");
  for (const entry of collectTreeEntries(rootDir))
    hash.update(serializeTreeEntry(entry));
  return `sha256:${hash.digest("hex")}`;
}
