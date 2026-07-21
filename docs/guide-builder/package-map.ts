import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { packageList } from "./packages";
import type { PackageEntry, PackageGroup } from "./types";

function packageJson(root: string, dir: string) {
  return JSON.parse(readFileSync(join(root, dir, "package.json"), "utf-8"));
}

function docFiles(root: string, dir: string): string[] {
  const docsDir = join(root, dir, "docs");
  if (!existsSync(docsDir)) return [];
  return readdirSync(docsDir)
    .filter((file) => file.endsWith(".md"))
    .sort((a, b) =>
      a === "README.md" ? -1 : b === "README.md" ? 1 : a.localeCompare(b),
    )
    .map((file) => `${dir}/docs/${file}`);
}

function packageEntry(
  root: string,
  dir: string,
  description?: string,
): PackageEntry {
  const pkg = packageJson(root, dir);
  const docsIndex = join(root, dir, "docs", "README.md");
  return {
    name: pkg.name as string,
    description: description ?? (pkg.description as string) ?? "",
    dir,
    readme: `${dir}/README.md`,
    docsIndex: existsSync(docsIndex) ? `${dir}/docs/README.md` : null,
    docs: docFiles(root, dir),
  };
}

export function buildPackageGroups(root: string): PackageGroup[] {
  const groups: Record<string, PackageEntry[]> = {};
  for (const { dir, group, description } of packageList) {
    (groups[group] ??= []).push(packageEntry(root, dir, description));
  }
  return Object.entries(groups).map(([group, packages]) => ({
    group,
    packages,
  }));
}
