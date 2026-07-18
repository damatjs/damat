import type { DurabilityExecutor } from "@damatjs/durability";
import {
  pipelineCapabilityErrors,
  validatePipelineManifest,
  type PipelineManifest,
} from "../definitions";
import type { PipelineValidationResult } from "./types";

export async function validateWebPipeline(
  manifest: PipelineManifest,
  client: DurabilityExecutor,
): Promise<PipelineValidationResult> {
  const errors: string[] = [];
  try {
    validatePipelineManifest(manifest);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  errors.push(...pipelineCapabilityErrors(manifest, true));
  const children = manifest.nodes
    .filter(
      (node) =>
        node.kind === "child" ||
        node.kind === "foreach" ||
        node.kind === "loop",
    )
    .map((node) => node.pipeline);
  for (const name of new Set(children)) {
    const result = await client.query(
      `SELECT 1 FROM "_damat_pipeline_definitions"
       WHERE "name"=$1 AND "active_version_id" IS NOT NULL`,
      [name],
    );
    if (!result.rowCount)
      errors.push(`Unknown published child pipeline "${name}"`);
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}
