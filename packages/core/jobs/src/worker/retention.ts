import {
  getDurabilityClient,
  type DurabilityClient,
  type WorkActor,
} from "@damatjs/durability";
import { getLogger } from "@damatjs/logger";
import {
  recordJobRetention,
  retentionError,
  validateRetentionActor,
} from "./retention-audit";
import { performJobRetention, retentionDetails } from "./retention-operation";
import { reconcileLimit } from "./reconcile-options";

export interface JobRetentionOptions {
  terminalBefore?: Date;
  deduplicationBefore?: Date;
  batchSize?: number;
  actor: WorkActor;
  client?: DurabilityClient;
  queue?: string;
}

export interface JobRetentionResult {
  deletedRuns: number;
  deletedDeduplication: number;
}

export async function runJobRetention(
  options: JobRetentionOptions,
): Promise<JobRetentionResult> {
  if (!options) throw new Error("retention options are required");
  validateRetentionActor(options.actor);
  const limit = reconcileLimit(options.batchSize);
  const client = options.client ?? getDurabilityClient();
  const details = retentionDetails(options, limit);
  await recordJobRetention(
    client,
    options.actor,
    "requested",
    details,
    options.queue,
  );
  try {
    return await performJobRetention(client, options, limit, details);
  } catch (error) {
    try {
      await recordJobRetention(
        client,
        options.actor,
        "failed",
        {
          ...details,
          ...retentionError(error),
        },
        options.queue,
      );
    } catch (auditError) {
      getLogger().error(
        "Job retention failure audit could not be recorded",
        auditError,
      );
    }
    throw error;
  }
}
