import fs from "node:fs";
import path from "node:path";
import { parseReleaseNote, versionFromFilename } from "@/lib/data/release-note";
import type { ReleaseGroup, ReleaseNote } from "@/lib/data/release-types";
import { REPO_ROOT } from "@/lib/data/repo";
import { compareSemverDesc } from "@/lib/data/semver";

export type { ReleaseGroup, ReleaseNote } from "@/lib/data/release-types";

const RELEASES_DIR = path.join(REPO_ROOT, "releases");
let cachedGroups: ReleaseGroup[] | null = null;

export function getReleaseGroups(): ReleaseGroup[] {
  if (cachedGroups) return cachedGroups;
  const byVersion = new Map<string, ReleaseNote[]>();
  for (const pkg of fs.readdirSync(RELEASES_DIR)) {
    const dir = path.join(RELEASES_DIR, pkg);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir)) {
      const version = versionFromFilename(file);
      if (!version) continue;
      const source = fs.readFileSync(path.join(dir, file), "utf8");
      const notes = byVersion.get(version) ?? [];
      notes.push(parseReleaseNote(pkg, version, source));
      byVersion.set(version, notes);
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

function readPackageVersion(relativePath: string): string {
  const raw = fs.readFileSync(
    path.join(REPO_ROOT, relativePath, "package.json"),
    "utf8",
  );
  return (JSON.parse(raw) as { version?: string }).version ?? "";
}

export function getCurrentVersion(): string {
  return readPackageVersion("packages/cli/damat");
}

export function getArchivedCodegenVersion(): string {
  return "2.1.0";
}

export function getReleaseTimeline(): {
  current: string;
  lockstep: ReleaseGroup[];
  independent: ReleaseGroup[];
} {
  const current = getCurrentVersion();
  const groups = getReleaseGroups();
  return {
    current,
    lockstep: groups.filter(
      (group) => compareSemverDesc(group.version, current) >= 0,
    ),
    independent: groups.filter(
      (group) => compareSemverDesc(group.version, current) < 0,
    ),
  };
}
