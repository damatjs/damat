import type { ArtifactProvenance } from "../../types/lockfile";
import type { AcquiredArtifact } from "../types";

export function createProvenance(
  artifact: AcquiredArtifact,
  immutableIdentity: string,
  metadata: Record<string, string>,
): ArtifactProvenance {
  return {
    request: artifact.request,
    immutableIdentity,
    resolvedAt: new Date().toISOString(),
    metadata,
  };
}
