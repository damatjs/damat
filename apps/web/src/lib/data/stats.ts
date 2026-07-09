import fs from "node:fs";
import path from "node:path";
import { getCurrentVersion } from "@/lib/data/releases";
import { REPO_ROOT } from "@/lib/data/repo";

/** Facts about the project, counted from the repo at build time. */
export interface SiteStats {
  /** Published (non-private) @damatjs/* packages in the monorepo. */
  packages: number;
  /** Chapters in the docs guide (docs/guide.json). */
  guideChapters: number;
  /** Current lockstep version (the damat CLI's package.json). */
  version: string;
}

function countPublishedPackages(): number {
  const root = path.join(REPO_ROOT, "packages");
  let count = 0;
  // packages/ nests one level of grouping (core/, orm/, cli/, …) at most.
  const visit = (dir: string, depth: number) => {
    const manifest = path.join(dir, "package.json");
    if (fs.existsSync(manifest)) {
      const pkg = JSON.parse(fs.readFileSync(manifest, "utf8")) as {
        private?: boolean;
      };
      if (!pkg.private) count++;
      return;
    }
    if (depth === 0) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) visit(path.join(dir, entry.name), depth - 1);
    }
  };
  visit(root, 2);
  return count;
}

function countGuideChapters(): number {
  const raw = fs.readFileSync(
    path.join(REPO_ROOT, "docs", "guide.json"),
    "utf8",
  );
  const guide = JSON.parse(raw) as { guide: Array<{ chapters: unknown[] }> };
  return guide.guide.reduce((sum, section) => sum + section.chapters.length, 0);
}

export function getSiteStats(): SiteStats {
  return {
    packages: countPublishedPackages(),
    guideChapters: countGuideChapters(),
    version: getCurrentVersion(),
  };
}
