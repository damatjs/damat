import { join } from "node:path";
import type { ModuleArtifactLocation, ResolvedModule } from "./types";
import { assertArtifactPath, firstExisting } from "./path";

const local = (root: string, name: string) => {
  const path = firstExisting([join(root, name), join(root, "src", name)]);
  return path ? assertArtifactPath(root, path, name) : undefined;
};

function provider(cwd: string, root: string, id: string, name: string) {
  return firstExisting([
    join(cwd, "src", name, id),
    join(root, name),
    join(root, "src", name),
  ]);
}

export function resolveBareSource(
  root: string,
  cwd: string,
  id: string,
  location: ModuleArtifactLocation,
): ResolvedModule {
  const entry = firstExisting([
    join(root, "index.ts"),
    join(root, "index.js"),
    join(root, "src/index.ts"),
    join(root, "src/index.js"),
  ]);
  if (!entry)
    throw new Error(`No runtime entry found for source module "${id}"`);
  const safeEntry = assertArtifactPath(root, entry, "entry");
  const models = local(root, "models");
  const migrations = local(root, "migrations");
  const workflows = provider(cwd, root, id, "workflows");
  const jobs = provider(cwd, root, id, "jobs");
  const events = provider(cwd, root, id, "events");
  const pipelines = provider(cwd, root, id, "pipelines");
  return {
    root,
    manifest: { name: id },
    entry: safeEntry,
    ...(models && { models }),
    ...(migrations && { migrations }),
    ...(workflows && { workflows }),
    ...(jobs && { jobs }),
    ...(events && { events }),
    ...(pipelines && { pipelines }),
    location,
    mutable: true,
  };
}
