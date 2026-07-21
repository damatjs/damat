import { relative, resolve } from "node:path";
import {
  coveragePackages,
  expectedSources,
  loadedSources,
} from "./coverage/sources";

export type CoverageGap = { packageDir: string; files: string[] };

export async function findCoverageGaps(root: string): Promise<CoverageGap[]> {
  const gaps: CoverageGap[] = [];
  for (const pkg of await coveragePackages(root)) {
    const loaded = await loadedSources(pkg);
    const files = (await expectedSources(pkg)).filter(
      (source) => !loaded.has(source),
    );
    if (files.length > 0) gaps.push({ packageDir: pkg.dir, files });
  }
  return gaps;
}

export function formatCoverageGaps(root: string, gaps: CoverageGap[]): string {
  return gaps
    .flatMap((gap) =>
      gap.files.map((file) => relative(root, file).replaceAll("\\", "/")),
    )
    .join("\n");
}

if (import.meta.main) {
  const root = resolve(import.meta.dir, "..");
  const gaps = await findCoverageGaps(root);
  if (gaps.length > 0) {
    console.error("Production source files missing from coverage:");
    console.error(formatCoverageGaps(root, gaps));
    process.exit(1);
  }
  console.log("Every instrumentable runtime source file entered coverage.");
}
