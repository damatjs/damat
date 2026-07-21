import { hashTree, verifyIntegrity } from "../integrity";
import type { OriginRequest } from "../types/origin";
import { acquireArtifact } from "./acquire";
import { createProvenance, finalizeGit, finalizeNpm } from "./finalize";
import type { AcquisitionPorts, ResolvedArtifact } from "./types";

export async function resolveArtifact(
  request: OriginRequest,
  ports: AcquisitionPorts,
): Promise<ResolvedArtifact> {
  const artifact = await acquireArtifact(request, ports);
  try {
    const integrity = hashTree(artifact.rootDir);
    if (artifact.expectedIntegrity)
      verifyIntegrity(artifact.expectedIntegrity, integrity);
    let immutableIdentity = `${artifact.request.type}:${integrity}`;
    let metadata = artifact.metadata;
    let packageReference = artifact.packageReference;
    if (artifact.request.type === "git") {
      const git = await finalizeGit(artifact, ports);
      immutableIdentity = git.identity;
      metadata = git.metadata;
      packageReference = git.packageReference;
    } else if (artifact.request.type === "npm")
      immutableIdentity = finalizeNpm(artifact);
    else if (artifact.request.type === "registry")
      immutableIdentity = `registry:${artifact.request.ref}:${integrity}`;
    const supportedModes = packageReference
      ? (["source", "package"] as const)
      : (["source"] as const);
    return {
      ...artifact,
      ...(packageReference && { packageReference }),
      integrity,
      immutableIdentity,
      provenance: createProvenance(artifact, immutableIdentity, metadata),
      supportedModes: [...supportedModes],
    };
  } catch (error) {
    artifact.cleanup();
    throw error;
  }
}
