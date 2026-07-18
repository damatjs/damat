import type { PipelineManifest } from "./manifest";

export function rejectUnreachableNodes(
  manifest: PipelineManifest,
  ids: Set<string>,
): void {
  const reached = new Set<string>();
  const visit = (id: string): void => {
    if (reached.has(id)) return;
    reached.add(id);
    for (const edge of manifest.edges.filter((value) => value.from === id))
      visit(edge.to);
  };
  visit(manifest.start);
  const missing = [...ids].filter((id) => !reached.has(id));
  if (missing.length)
    throw new Error(`Unreachable pipeline nodes: ${missing.join(", ")}`);
}

export function rejectPipelineCycles(
  manifest: PipelineManifest,
  ids: Set<string>,
): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const walk = (id: string): void => {
    if (visiting.has(id))
      throw new Error("Pipeline cycles require an explicit loop node");
    if (visited.has(id)) return;
    visiting.add(id);
    for (const edge of manifest.edges.filter((value) => value.from === id))
      walk(edge.to);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of ids) walk(id);
}
