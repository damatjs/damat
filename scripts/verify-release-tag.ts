import { resolve } from "node:path";
import type { WorkspacePackage } from "./publish/types";
import { discoverPackages } from "./publish/workspaces";

export function verifyReleaseTag(
  tag: string,
  packages: WorkspacePackage[],
): string {
  const versions = new Set(packages.map(({ version }) => version));
  if (versions.size !== 1)
    throw new Error(
      `Shared package versions diverged: ${[...versions].join(", ")}`,
    );
  const version = packages[0]?.version;
  if (!version) throw new Error("No shared public packages were discovered");
  const expected = `v${version}`;
  if (tag !== expected)
    throw new Error(`Release tag ${tag || "<missing>"} must equal ${expected}`);
  return version;
}

if (import.meta.main) {
  const root = resolve(import.meta.dir, "..");
  const tag = process.env.RELEASE_TAG ?? process.env.GITHUB_REF_NAME ?? "";
  const version = verifyReleaseTag(tag, discoverPackages(root));
  console.log(`Release tag ${tag} matches shared package version ${version}.`);
}
