import type { DurabilityExecutor } from "@damatjs/durability";
import type { QueryResultRow } from "@damatjs/deps/pg";
import type { PipelineManifest } from "../definitions";

interface ActiveManifestRow extends QueryResultRow {
  name: string;
  manifest: PipelineManifest;
}

export async function validatePipelineComposition(
  executor: DurabilityExecutor,
): Promise<void> {
  const result = await executor.query<ActiveManifestRow>(
    `SELECT d."name",v."manifest" FROM "_damat_pipeline_definitions" d
     JOIN "_damat_pipeline_versions" v ON v."id"=d."active_version_id"`,
  );
  const graph = new Map(
    result.rows.map((row) => [row.name, children(row.manifest)]),
  );
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const walk = (name: string, path: string[]): void => {
    if (visiting.has(name))
      throw new Error(
        `Pipeline child cycle is not bounded: ${[...path, name].join(" -> ")}`,
      );
    if (visited.has(name)) return;
    visiting.add(name);
    for (const child of graph.get(name) ?? [])
      if (graph.has(child)) walk(child, [...path, name]);
    visiting.delete(name);
    visited.add(name);
  };
  for (const name of graph.keys()) walk(name, []);
}

function children(manifest: PipelineManifest): string[] {
  return manifest.nodes.flatMap((node) =>
    node.kind === "child" || node.kind === "foreach" || node.kind === "loop"
      ? [node.pipeline]
      : [],
  );
}
