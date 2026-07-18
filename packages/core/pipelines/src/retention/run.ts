import {
  getDurabilityClient,
  validateWorkActor,
  withIdempotency,
} from "@damatjs/durability";
import type {
  PipelineRetentionOptions,
  PipelineRetentionResult,
} from "./types";
import { retainPipelineRuns } from "./retain";

export async function runPipelineRetention(
  options: PipelineRetentionOptions,
): Promise<PipelineRetentionResult> {
  validateWorkActor(options.actor);
  if (!options.reason.trim() || !options.idempotencyKey.trim()) {
    throw new Error(
      "Pipeline retention reason and idempotency key are required",
    );
  }
  if (
    options.terminalBefore &&
    Number.isNaN(options.terminalBefore.getTime())
  ) {
    throw new Error("Pipeline retention terminalBefore must be a valid date");
  }
  const limit = options.batchSize ?? 100;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1_000) {
    throw new Error("Pipeline retention batchSize must be between 1 and 1000");
  }
  const client = options.client ?? getDurabilityClient();
  return client.transaction(async (executor) => {
    const result = await withIdempotency(
      { scope: "pipeline-retention:*", key: options.idempotencyKey, executor },
      async (transaction) => {
        const value = await retainPipelineRuns(
          transaction,
          options.terminalBefore ?? null,
          limit,
          options.actor,
          options.reason,
        );
        return {
          deletedRuns: value.deletedRuns,
          deletedJobs: value.deletedJobs,
        };
      },
    );
    return result.value;
  });
}
