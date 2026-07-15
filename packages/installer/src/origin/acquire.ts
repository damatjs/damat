import { parseOriginRequest } from "../schema";
import type { OriginRequest } from "../types/origin";
import { acquireGit } from "./git";
import { acquireLocal } from "./local";
import { acquireNpm } from "./npm";
import { acquireRegistry } from "./registry";
import { acquireTarball } from "./tarball";
import type { AcquisitionPorts, AcquiredArtifact } from "./types";

async function acquire(
  request: OriginRequest,
  ports: AcquisitionPorts,
  visited: Set<string>,
): Promise<AcquiredArtifact> {
  const parsed = parseOriginRequest(request);
  if (parsed.type === "local") return acquireLocal(parsed.path);
  if (parsed.type === "git") return acquireGit(parsed, ports);
  if (parsed.type === "registry")
    return acquireRegistry(parsed, ports, visited, (next, seen) =>
      acquire(next, ports, seen),
    );
  if (parsed.type === "npm") return acquireNpm(parsed, ports);
  if (parsed.type === "tarball") return acquireTarball(parsed, ports);
  throw new Error("unsupported origin");
}

export async function acquireArtifact(
  request: OriginRequest,
  ports: AcquisitionPorts,
): Promise<AcquiredArtifact> {
  return acquire(request, ports, new Set());
}
