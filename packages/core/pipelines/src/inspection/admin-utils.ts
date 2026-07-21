import { validateWorkActor } from "@damatjs/durability";
import type { PipelineAdminOptions } from "./types";

export function validatePipelineAdminOptions(
  options: PipelineAdminOptions,
): void {
  validateWorkActor(options.actor);
  if (!options.reason.trim())
    throw new Error("Pipeline control reason is required");
  if (!options.idempotencyKey.trim())
    throw new Error("Pipeline control idempotency key is required");
}

export function controlScope(runId: string, operation: string): string {
  return `pipeline-control:${runId}:${operation}`;
}
