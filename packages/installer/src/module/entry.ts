import { join } from "node:path";
import type { ModuleManifest } from "./types";
import { assertArtifactPath, declaredPath, firstExisting } from "./path";

export function resolveManifestEntry(
  root: string,
  manifestDir: string,
  manifest: ModuleManifest,
): string {
  const explicit = declaredPath(
    root,
    manifestDir,
    "entry",
    manifest.paths?.entry,
  );
  if (explicit) return explicit;
  const entry = firstExisting([
    join(manifestDir, "index.ts"),
    join(manifestDir, "index.js"),
    join(manifestDir, "src/index.ts"),
    join(manifestDir, "src/index.js"),
  ]);
  if (entry) return assertArtifactPath(root, entry, "entry");
  throw new Error(`No runtime entry found for module "${manifest.name}"`);
}
