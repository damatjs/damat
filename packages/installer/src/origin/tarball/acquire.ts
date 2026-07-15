import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { OriginRequest } from "../../types/origin";
import { hashBytes, verifyArchiveIntegrity } from "../../integrity";
import type { AcquisitionPorts, AcquiredArtifact } from "../types";
import { extractTar } from "./extract";

type TarballRequest = Extract<OriginRequest, { type: "tarball" }>;

async function loadBytes(
  request: TarballRequest,
  ports: AcquisitionPorts,
): Promise<Uint8Array> {
  if (/^https?:\/\//.test(request.url)) {
    if (!ports.fetch)
      throw new Error("remote tarball acquisition requires fetch");
    const response = await ports.fetch(request.url);
    if (!response.ok)
      throw new Error(`tarball request failed with status ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
  const path = request.url.startsWith("file:")
    ? fileURLToPath(request.url)
    : request.url;
  return readFileSync(path);
}

export async function acquireTarball(
  request: TarballRequest,
  ports: AcquisitionPorts,
): Promise<AcquiredArtifact> {
  const parent = ports.tempRoot ?? tmpdir();
  mkdirSync(parent, { recursive: true });
  const rootDir = mkdtempSync(join(parent, "damat-installer-tar-"));
  try {
    const bytes = await loadBytes(request, ports);
    const archiveIntegrity = request.integrity
      ? verifyArchiveIntegrity(request.integrity, bytes)
      : hashBytes(bytes);
    extractTar(bytes, rootDir);
    let cleaned = false;
    return {
      request,
      rootDir,
      metadata: {
        sourceUrl: request.url,
        archiveIntegrity,
        ...(request.integrity && { expectedIntegrity: request.integrity }),
      },
      cleanup() {
        if (!cleaned) rmSync(rootDir, { recursive: true, force: true });
        cleaned = true;
      },
    };
  } catch (error) {
    rmSync(rootDir, { recursive: true, force: true });
    throw error;
  }
}
