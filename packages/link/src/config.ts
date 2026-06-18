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
 * links are unaffected. Used by the framework boot to register the aggregated
 * `link` runtime module.
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

/**
 * Resolve the per-owner-module link directories under `config.links` for
 * migration + type discovery.
 *
 * The links tree mirrors modules: `src/links/<owner>/{models,index.ts,migrations}`.
 * Each `<owner>` directory is its own migration module (id `link:<owner>`), so
 * its junction tables get a dedicated `migrations/` folder and snapshot — the
 * `damat-orm` CLI treats each like a normal module.
 */
export function resolveLinkMigrationModules(
  links: string | string[] | undefined,
  cwd: string,
): LinkModuleEntry[] {
  if (!links) return [];
  const roots = Array.isArray(links) ? links : [links];
  const entries: LinkModuleEntry[] = [];

  for (const rel of roots) {
    const absRoot = path.isAbsolute(rel) ? rel : path.resolve(cwd, rel);
    if (!fs.existsSync(absRoot)) continue;

    for (const name of fs.readdirSync(absRoot)) {
      const sub = path.join(absRoot, name);
      let isDir = false;
      try {
        isDir = fs.statSync(sub).isDirectory();
      } catch {
        continue;
      }
      if (!isDir || !hasEntryIndex(sub)) continue;
      entries.push({
        id: `link:${name}`,
        resolve: sub,
        path: path.join(rel, name),
      });
    }
  }

  return entries;
}
