import fs from "node:fs";
import path from "node:path";
import { GITHUB_BLOB, REPO_ROOT } from "@/lib/data/repo";

/** One `releases/<pkg>/<version>.md` note, summarized. */
export interface ReleaseNote {
  /** Folder name, e.g. `damat-cli`. */
  pkg: string;
  /** Published name from the note's H1, e.g. `@damatjs/damat-cli`. */
  npmName: string;
  version: string;
  /** The note's `>` blockquote — a one-paragraph before/after summary. */
  summary: string;
  /** GitHub link to the full note. */
  sourceUrl: string;
}

/** All notes released as one version (packages version in lockstep). */
export interface ReleaseGroup {
  version: string;
  notes: ReleaseNote[];
}

const RELEASES_DIR = path.join(REPO_ROOT, "releases");

function compareSemverDesc(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Pull the H1 package name and the leading `>` blockquote out of a note. */
function parseNote(pkg: string, version: string, source: string): ReleaseNote {
  const lines = source.split("\n");
  const h1 = lines.find((l) => l.startsWith("# "));
  // The filename is the authoritative version; drop whatever version the H1 carries.
  const npmName =
    h1
      ?.replace(/^# /, "")
      .replace(/\s+\d+\.\d+\.\d+$/, "")
      .trim() ?? pkg;

  const quote: string[] = [];
  let inQuote = false;
  for (const line of lines) {
    if (line.startsWith(">")) {
      inQuote = true;
      quote.push(line.replace(/^>\s?/, ""));
    } else if (inQuote) {
      break;
    }
  }
  const summary = quote
    .join(" ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // strip markdown links, keep text
    .replace(/\s+/g, " ")
    .trim();

  return {
    pkg,
    npmName,
    version,
    summary,
    sourceUrl: `${GITHUB_BLOB}/releases/${pkg}/${version}.md`,
  };
}

let cachedGroups: ReleaseGroup[] | null = null;

/** Every release note in `releases/`, grouped by version, newest first. */
export function getReleaseGroups(): ReleaseGroup[] {
  if (cachedGroups) return cachedGroups;

  const byVersion = new Map<string, ReleaseNote[]>();
  for (const pkg of fs.readdirSync(RELEASES_DIR)) {
    const dir = path.join(RELEASES_DIR, pkg);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir)) {
      const match = /^(\d+\.\d+\.\d+)\.md$/.exec(file);
      if (!match) continue;
      const version = match[1];
      const note = parseNote(
        pkg,
        version,
        fs.readFileSync(path.join(dir, file), "utf8"),
      );
      const group = byVersion.get(version) ?? [];
      group.push(note);
      byVersion.set(version, group);
    }
  }

  cachedGroups = [...byVersion.entries()]
    .map(([version, notes]) => ({
      version,
      notes: notes.sort((a, b) => a.pkg.localeCompare(b.pkg)),
    }))
    .sort((a, b) => compareSemverDesc(a.version, b.version));
  return cachedGroups;
}

function readPackageVersion(relPath: string): string {
  const raw = fs.readFileSync(
    path.join(REPO_ROOT, relPath, "package.json"),
    "utf8",
  );
  return (JSON.parse(raw) as { version?: string }).version ?? "";
}

/**
 * The current lockstep version. Packages release in lockstep, so the `damat`
 * CLI — the line's entry point — is the version of record; reading its
 * package.json can never go stale the way a hand-written README line can.
 */
export function getCurrentVersion(): string {
  return readPackageVersion("packages/cli/damat");
}

/** @damatjs/codegen runs ahead of the lockstep line on its own version. */
export function getCodegenVersion(): string {
  return readPackageVersion("packages/core/codegen");
}

/**
 * The release record split into the lockstep timeline and the notes from
 * package lines running ahead of it (today: @damatjs/codegen, published at
 * 1.0.0 independently before the shared line existed).
 */
export function getReleaseTimeline(): {
  current: string;
  lockstep: ReleaseGroup[];
  independent: ReleaseGroup[];
} {
  const current = getCurrentVersion();
  const groups = getReleaseGroups();
  return {
    current,
    lockstep: groups.filter((g) => compareSemverDesc(g.version, current) >= 0),
    independent: groups.filter(
      (g) => compareSemverDesc(g.version, current) < 0,
    ),
  };
}
