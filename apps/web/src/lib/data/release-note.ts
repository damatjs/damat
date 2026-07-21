import type { ReleaseNote } from "@/lib/data/release-types";
import { GITHUB_BLOB } from "@/lib/data/repo";
import { isSemver } from "@/lib/data/semver";

export function versionFromFilename(file: string): string | null {
  if (!file.endsWith(".md")) return null;
  const version = file.slice(0, -3);
  return isSemver(version) ? version : null;
}

function extractSummary(lines: string[]): string {
  const quote: string[] = [];
  let inQuote = false;
  for (const line of lines) {
    if (line.startsWith(">")) {
      inQuote = true;
      quote.push(line.replace(/^>\s?/, ""));
    } else if (inQuote) break;
  }
  return quote
    .join(" ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseReleaseNote(
  pkg: string,
  version: string,
  source: string,
): ReleaseNote {
  const lines = source.split("\n");
  const h1 = lines.find((line) => line.startsWith("# "));
  const npmName = h1
    ? h1
        .replace(/^# /, "")
        .replace(/\s+\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, "")
        .trim()
    : pkg;
  return {
    pkg,
    npmName,
    version,
    summary: extractSummary(lines),
    sourceUrl: `${GITHUB_BLOB}/releases/${pkg}/${version}.md`,
  };
}
