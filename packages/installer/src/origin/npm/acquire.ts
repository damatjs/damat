import { existsSync } from "node:fs";
import { join } from "node:path";
import type { AcquisitionPorts, AcquiredArtifact } from "../types";
import { acquireTarball } from "../tarball";
import { selectPackageMetadata } from "./metadata";
import { npmMetadataUrl, type NpmRequest } from "./parse";

export async function acquireNpm(
  request: NpmRequest,
  ports: AcquisitionPorts,
): Promise<AcquiredArtifact> {
  if (!ports.fetch) throw new Error("npm acquisition requires fetch");
  const response = await ports.fetch(npmMetadataUrl(request));
  if (!response.ok)
    throw new Error(
      `npm metadata request failed with status ${response.status}`,
    );
  const selected = selectPackageMetadata(request, await response.json());
  const archive = await acquireTarball(
    {
      type: "tarball",
      url: selected.tarball,
      ...(selected.integrity && { integrity: selected.integrity }),
    },
    ports,
  );
  const rootDir = join(archive.rootDir, "package");
  if (!existsSync(rootDir)) {
    archive.cleanup();
    throw new Error("npm archive is missing its package root");
  }
  return {
    ...archive,
    request,
    rootDir,
    packageReference: `${request.name}@${selected.version}`,
    metadata: {
      ...archive.metadata,
      packageName: request.name,
      selectedVersion: selected.version,
      tarball: selected.tarball,
    },
  };
}
