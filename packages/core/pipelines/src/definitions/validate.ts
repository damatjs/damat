import type { PipelineManifest } from "./manifest";
import { validatePipelineEdges } from "./validate-edge";
import { validatePipelineNode } from "./validate-node";
import { validatePipelineTriggers } from "./validate-trigger";
import { validatePipelineValue } from "./validate-value";
import { rejectPipelineCycles, rejectUnreachableNodes } from "./validate-graph";

export function validatePipelineManifest(manifest: PipelineManifest): void {
  if (!manifest.nodes.length)
    throw new Error("Pipeline requires at least one node");
  const ids = new Set<string>();
  for (const node of manifest.nodes) {
    validatePipelineNode(node);
    if (ids.has(node.id))
      throw new Error(`Duplicate pipeline node "${node.id}"`);
    ids.add(node.id);
  }
  if (!ids.has(manifest.start))
    throw new Error(`Unknown pipeline start node "${manifest.start}"`);
  validatePipelineEdges(manifest, ids);
  rejectPipelineCycles(manifest, ids);
  rejectUnreachableNodes(manifest, ids);
  validatePipelineTriggers(manifest);
  validatePolicy(manifest);
  validateOperationalLimits(manifest);
  if (manifest.output !== undefined)
    validatePipelineValue(manifest.output, "pipeline.output");
}

function validatePolicy(manifest: PipelineManifest): void {
  if (
    manifest.retentionMs !== undefined &&
    manifest.retentionMs !== "forever" &&
    (!Number.isSafeInteger(manifest.retentionMs) || manifest.retentionMs < 0)
  ) {
    throw new Error(
      "Pipeline retentionMs must be a nonnegative safe integer or forever",
    );
  }
  if (
    manifest.inspection &&
    !["metadata", "full", "hidden"].includes(manifest.inspection.visibility)
  ) {
    throw new Error("Pipeline inspection visibility is invalid");
  }
}

export function validateOperationalLimits(
  manifest: PipelineManifest,
  maxActivations = 10_000,
  maxFanOut = 1_000,
): void {
  let activations = manifest.nodes.length;
  for (const node of manifest.nodes) {
    if (node.kind === "foreach") {
      if (node.maxItems > maxFanOut)
        throw new Error(`Pipeline foreach "${node.id}" exceeds maxFanOut`);
      if (
        node.concurrency !== undefined &&
        (!Number.isSafeInteger(node.concurrency) ||
          node.concurrency < 1 ||
          node.concurrency > node.maxItems)
      ) {
        throw new Error(
          `Pipeline foreach "${node.id}" has invalid concurrency`,
        );
      }
      activations += node.maxItems;
    }
    if (node.kind === "loop") activations += node.maxIterations;
  }
  if (activations > maxActivations)
    throw new Error("Pipeline exceeds maxNodeActivationsPerRun");
}
