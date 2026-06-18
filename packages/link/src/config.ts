import fs from "node:fs";
import path from "node:path";

export interface LinkModuleEntry {
  /** Registration id (`"link"` for a single dir, `"link:<name>"` for many). */
  id: string;
  /** Absolute path to the link directory. */
  resolve: string;
  /** The original (possibly relative) path as written in config. */
  path: string;
}

function hasEntryIndex(dir: string): boolean {
  if (!fs.existsSync(dir)) return false;
  return (
    fs.existsSync(path.join(dir, "index.ts")) ||
    fs.existsSync(path.join(dir, "index.js"))
  );
}

/**
 * Resolve `config.links` into module-like entries.
 *
 * `links` is a path or list of paths (e.g. `"./src/links"`). Only directories
 * that exist and expose an entry index are returned, so apps that don't use
 * links are unaffected. Shared by the framework boot and the `damat-orm` CLI so
 * a links directory automatically participates in both running and migrating.
 */
export function resolveLinkModuleEntries(
  links: string | string[] | undefined,
  cwd: string,
): LinkModuleEntry[] {
  if (!links) return [];
  const paths = Array.isArray(links) ? links : [links];
  const entries: LinkModuleEntry[] = [];

  for (const rel of paths) {
    const abs = path.isAbsolute(rel) ? rel : path.resolve(cwd, rel);
    if (!hasEntryIndex(abs)) continue;
    const id = paths.length === 1 ? "link" : `link:${path.basename(abs)}`;
    entries.push({ id, resolve: abs, path: rel });
  }

  return entries;
}
