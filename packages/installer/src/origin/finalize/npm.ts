import type { AcquiredArtifact } from "../types";

export function finalizeNpm(artifact: AcquiredArtifact): string {
  const name = artifact.metadata.packageName;
  const version = artifact.metadata.selectedVersion;
  if (!name || !version)
    throw new Error("npm acquisition is missing exact version metadata");
  return `npm:${name}@${version}`;
}
