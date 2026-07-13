import { join, sep } from "node:path";
import { readdirSync, lstatSync } from "node:fs";
import { KIT_MANIFEST_FILENAME, type KitManifest } from "./manifest";

/** One planned copy: where a kit file lands in the receiving project. */
export interface PlannedFile {
  /** Path relative to the kit root. */
  source: string;
  /** Path relative to the project root. */
  target: string;
  /** Which rule placed it. */
  via: "mapping" | "fallback";
}

export interface KitPlan {
  files: PlannedFile[];
  /** Files matched by no mapping when the manifest has no `fallback`. */
  unmatched: string[];
}

/**
 * Resolve every kit file to its target location: first matching mapping wins,
 * the manifest's `fallback` catches the rest, and with no fallback the
 * leftovers are reported (never silently dropped, never guessed).
 */
export function buildKitPlan(kitDir: string, manifest: KitManifest): KitPlan {
  const files = listKitFiles(kitDir, manifest.ignore ?? []);
  const matchers = manifest.mappings.map((m) => ({
    to: m.to,
    regex: globToRegExp(m.from),
    prefix: staticPrefix(m.from),
  }));

  const planned: PlannedFile[] = [];
  const unmatched: string[] = [];
  for (const file of files) {
    const mapping = matchers.find((m) => m.regex.test(file));
    if (mapping) {
      // Drop the glob's static prefix so "components/**" → "src/ui" nests
      // "components/nav/menu.tsx" as "src/ui/nav/menu.tsx".
      const remainder =
        mapping.prefix && file.startsWith(mapping.prefix)
          ? file.slice(mapping.prefix.length)
          : file;
      planned.push({
        source: file,
        target: joinRel(mapping.to, remainder),
        via: "mapping",
      });
    } else if (manifest.fallback) {
      planned.push({
        source: file,
        target: joinRel(manifest.fallback, file),
        via: "fallback",
      });
    } else {
      unmatched.push(file);
    }
  }
  return { files: planned, unmatched };
}

/** All copyable files under the kit root (relative, /-separated, sorted). */
function listKitFiles(kitDir: string, ignore: string[]): string[] {
  const ignoreMatchers = ignore.map(globToRegExp);
  const out: string[] = [];
  const walk = (dir: string, rel: string): void => {
    for (const entry of readdirSync(dir)) {
      if (entry === ".git" || entry === "node_modules") continue;
      const abs = join(dir, entry);
      const entryRel = rel === "" ? entry : `${rel}/${entry}`;
      // lstat, never stat: a hostile kit could plant a symlink pointing
      // outside its own tree (the user's files!) — following it would copy
      // foreign content into the target project. Symlinks never ship.
      const stat = lstatSync(abs);
      if (stat.isSymbolicLink()) continue;
      if (stat.isDirectory()) {
        walk(abs, entryRel);
        continue;
      }
      if (entryRel === KIT_MANIFEST_FILENAME) continue; // describes, never ships
      if (ignoreMatchers.some((re) => re.test(entryRel))) continue;
      out.push(entryRel);
    }
  };
  walk(kitDir, "");
  return out.sort();
}

/**
 * Kit globs: `**` crosses path segments, `*` stays within one, `?` is a
 * single non-separator character. A bare directory prefix ("docs") matches
 * nothing by itself — write "docs/**".
 */
export function globToRegExp(glob: string): RegExp {
  let out = "^";
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i]!;
    if (ch === "*") {
      if (glob[i + 1] === "*") {
        out += ".*";
        i++;
        // Collapse "**/" so "components/**" also matches "components/a.ts".
        if (glob[i + 1] === "/") i++;
      } else {
        out += "[^/]*";
      }
    } else if (ch === "?") {
      out += "[^/]";
    } else {
      out += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(out + "$");
}

/** The literal path segments before the first wildcard ("components/**" → "components/"). */
export function staticPrefix(glob: string): string {
  const wildcardAt = glob.search(/[*?]/);
  const literal = wildcardAt === -1 ? glob : glob.slice(0, wildcardAt);
  const lastSlash = literal.lastIndexOf("/");
  return lastSlash === -1 ? "" : literal.slice(0, lastSlash + 1);
}

/** Join manifest paths with the platform separator, normalizing "/" input. */
function joinRel(base: string, rest: string): string {
  return [
    ...base.split("/").filter(Boolean),
    ...rest.split("/").filter(Boolean),
  ].join(sep);
}
