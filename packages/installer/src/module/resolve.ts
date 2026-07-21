import { locateModuleManifest, ModuleManifestNotFoundError } from "./manifest";
import { resolveManifestEntry } from "./entry";
import { resolveArtifactRoot } from "./location";
import { declaredPath } from "./path";
import { resolveBareSource } from "./source";
import type { ModuleArtifactLocation, ResolvedModule } from "./types";
import { statSync } from "node:fs";
import { dirname } from "node:path";

const CAPABILITIES = [
  "models",
  "migrations",
  "routes",
  "workflows",
  "jobs",
  "events",
  "pipelines",
] as const;

export function resolveModuleArtifact(
  location: ModuleArtifactLocation,
  cwd: string,
  id?: string,
): ResolvedModule {
  const artifact = resolveArtifactRoot(location, cwd);
  if (typeof location === "string") {
    try {
      if (statSync(artifact.root).isFile()) {
        return {
          root: dirname(artifact.root),
          manifest: { name: id ?? dirname(artifact.root).split("/").at(-1)! },
          entry: artifact.root,
          location,
          mutable: true,
        };
      }
    } catch {
      // manifest/source resolution below provides the descriptive error
    }
  }
  let located;
  try {
    located = locateModuleManifest(artifact.root);
  } catch (error) {
    if (
      error instanceof ModuleManifestNotFoundError &&
      typeof location === "string" &&
      id
    )
      return resolveBareSource(artifact.root, cwd, id, location);
    throw error;
  }
  const resolved: ResolvedModule = {
    root: artifact.root,
    manifest: located.manifest,
    entry: resolveManifestEntry(
      artifact.root,
      located.manifestDir,
      located.manifest,
    ),
    location,
    mutable: artifact.mutable,
    ...(artifact.packageName && { packageName: artifact.packageName }),
  };
  for (const capability of CAPABILITIES) {
    const path = declaredPath(
      artifact.root,
      located.manifestDir,
      capability,
      located.manifest.paths?.[capability],
    );
    if (path) resolved[capability] = path;
  }
  return resolved;
}
