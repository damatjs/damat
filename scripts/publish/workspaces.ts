import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { WorkspacePackage } from "./types";

const PACKAGE_GLOBS = [
  "packages/*",
  "packages/cli/*",
  "packages/core/*",
  "packages/orm/*",
  "provider/*",
];

export function discoverPackages(root: string): WorkspacePackage[] {
  const packages: WorkspacePackage[] = [];
  for (const glob of PACKAGE_GLOBS) {
    const base = join(root, glob.replace("/*", ""));
    if (!existsSync(base)) continue;
    for (const entry of new Bun.Glob("*/package.json").scanSync({
      cwd: base,
    })) {
      const dir = join(base, entry, "..");
      const manifest = JSON.parse(
        readFileSync(join(dir, "package.json"), "utf8"),
      ) as WorkspacePackage;
      if (packages.some(({ name }) => name === manifest.name)) continue;
      packages.push({ ...manifest, dir });
    }
  }
  return packages
    .filter(({ private: isPrivate }) => !isPrivate)
    .sort((left, right) => left.name.localeCompare(right.name));
}
