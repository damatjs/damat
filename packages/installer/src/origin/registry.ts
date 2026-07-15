import type { OriginRequest } from "../types/origin";
import type { AcquisitionPorts, AcquiredArtifact } from "./types";

type RegistryRequest = Extract<OriginRequest, { type: "registry" }>;
type AcquireNext = (
  request: OriginRequest,
  visited: Set<string>,
) => Promise<AcquiredArtifact>;

export async function acquireRegistry(
  request: RegistryRequest,
  ports: AcquisitionPorts,
  visited: Set<string>,
  acquireNext: AcquireNext,
): Promise<AcquiredArtifact> {
  if (!ports.resolveRegistry)
    throw new Error("registry acquisition requires a resolver");
  if (visited.has(request.ref))
    throw new Error(`registry resolution cycle: ${request.ref}`);
  const nextVisited = new Set(visited).add(request.ref);
  const descriptor = await ports.resolveRegistry(request.ref);
  const acquired = await acquireNext(descriptor.origin, nextVisited);
  const expectedIntegrity = descriptor.integrity ?? acquired.expectedIntegrity;
  const packageReference =
    descriptor.packageReference ?? acquired.packageReference;
  return {
    ...acquired,
    request,
    ...(expectedIntegrity && { expectedIntegrity }),
    ...(packageReference && { packageReference }),
    metadata: {
      ...acquired.metadata,
      registryRef: request.ref,
      ...(descriptor.owner && { owner: descriptor.owner }),
      ...(descriptor.verification && { verification: descriptor.verification }),
      registryOrigin: JSON.stringify(descriptor.origin),
    },
  };
}
