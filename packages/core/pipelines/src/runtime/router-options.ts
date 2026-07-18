import type { DurabilityCoordinator } from "@damatjs/durability";

export interface PipelineRouterOptions {
  pollIntervalMs?: number;
  retryIntervalMs?: number;
  batchSize?: number;
  retentionIntervalMs?: number;
  coordinator?: DurabilityCoordinator;
}

export interface ResolvedPipelineRouterOptions {
  pollIntervalMs: number;
  retryIntervalMs: number;
  batchSize: number;
  retentionIntervalMs: number;
  coordinator?: DurabilityCoordinator;
}

export function resolvePipelineRouterOptions(
  options: PipelineRouterOptions,
): ResolvedPipelineRouterOptions {
  const resolved = {
    pollIntervalMs: options.pollIntervalMs ?? 5_000,
    retryIntervalMs: options.retryIntervalMs ?? 1_000,
    batchSize: options.batchSize ?? 100,
    retentionIntervalMs: options.retentionIntervalMs ?? 3_600_000,
    ...(options.coordinator ? { coordinator: options.coordinator } : {}),
  };
  for (const [name, value] of Object.entries(resolved)) {
    if (name === "coordinator") continue;
    if (!Number.isSafeInteger(value) || Number(value) < 1) {
      throw new Error(`${name} must be a positive safe integer`);
    }
  }
  if (resolved.batchSize > 1_000)
    throw new Error("batchSize cannot exceed 1000");
  return resolved;
}
