import type { PipelineManifest } from "./manifest";
import {
  validatePipelineExpression,
  validatePipelineValue,
} from "./validate-value";

export function validatePipelineEdges(
  manifest: PipelineManifest,
  ids: Set<string>,
): void {
  const edges = new Set<string>();
  for (const edge of manifest.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) {
      throw new Error(
        `Pipeline edge references an unknown node: ${edge.from} -> ${edge.to}`,
      );
    }
    const key = `${edge.from}\0${edge.to}`;
    if (edges.has(key))
      throw new Error(`Duplicate pipeline edge: ${edge.from} -> ${edge.to}`);
    edges.add(key);
    if (edge.on && !["success", "failure", "always"].includes(edge.on)) {
      throw new Error(
        `Pipeline edge ${edge.from} -> ${edge.to} has an invalid outcome`,
      );
    }
    if (edge.input !== undefined) {
      validatePipelineValue(edge.input, `edge.${edge.from}.${edge.to}.input`);
    }
    if (edge.when) {
      validatePipelineExpression(
        edge.when,
        `edge.${edge.from}.${edge.to}.when`,
      );
    }
  }
}
