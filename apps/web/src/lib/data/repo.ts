import fs from "node:fs";
import path from "node:path";
import { GITHUB_URL } from "@/lib/constants";

/**
 * Walk up from the web app until we find the monorepo root (the folder that
 * holds `docs/guide.json`). Build-time content — registry data and release
 * notes — is read from the canonical repo folders instead of copied snapshots.
 * Server-only: import from server components / loaders, never client code.
 */
function findRepoRoot(start: string): string {
  let dir = start;
  for (;;) {
    if (fs.existsSync(path.join(dir, "docs", "guide.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error("Could not locate repo root (docs/guide.json not found)");
    }
    dir = parent;
  }
}

export const REPO_ROOT = findRepoRoot(process.cwd());

/** Link out to a repo file not rendered on this site. */
export const GITHUB_BLOB = `${GITHUB_URL}/blob/main`;
