import { resolve } from "node:path";
import type { WorkspacePackage } from "./publish/types";
import { discoverPackages } from "./publish/workspaces";
import { verifyWorkspaceLock } from "./release/workspace-lock";

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
  if (version.includes("+"))
    throw new Error(
      "Public npm package versions must not include SemVer build metadata",
    );
  const expected = `v${version}`;
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const accepted = new RegExp(
    `^v${escaped}(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$`,
  );
  if (!accepted.test(tag))
    throw new Error(
      `Release tag ${tag || "<missing>"} must equal ${expected} or add valid build metadata`,
    );
  return version;
}

if (import.meta.main) {
  const root = resolve(import.meta.dir, "..");
  const tag = process.env.RELEASE_TAG ?? process.env.GITHUB_REF_NAME ?? "";
  const packages = discoverPackages(root);
  verifyWorkspaceLock(root, packages);
  const version = verifyReleaseTag(tag, packages);
  console.log(`Release tag ${tag} matches shared package version ${version}.`);
}
